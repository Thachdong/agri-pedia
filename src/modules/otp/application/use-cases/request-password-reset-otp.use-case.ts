import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { CRYPTO_SERVICE, ICryptoService } from '@shared/crypto';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { IMessageSender, MESSAGE_SENDER } from '@shared/messaging';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import {
  EOtpPurpose,
  EOtpSender,
  Otp,
  OtpAccountNotActiveException,
  OtpAccountNotFoundException,
} from '../../domain';
import { IOtpRepository, OTP_REPOSITORY } from '../ports/otp.repository';
import { buildOtpMessage } from '../services/otp-message.builder';

export type TRequestPasswordResetOtpInput = {
  loginType: EOtpSender;
  /** Raw identifier as typed by the client. */
  identifier: string;
};

/**
 * Sends a RESET_PASSWORD code to an ACTIVE account. Refused while the previous
 * reset code is still valid (OtpAlreadyRequested) or blocked (OtpBlocked).
 */
@Injectable()
export class RequestPasswordResetOtpUseCase {
  constructor(
    @Inject(OTP_REPOSITORY) private readonly otps: IOtpRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(CRYPTO_SERVICE) private readonly crypto: ICryptoService,
    @Inject(MESSAGE_SENDER) private readonly messageSender: IMessageSender,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TRequestPasswordResetOtpInput): Promise<void> {
    const account = await this.userQuery.findByIdentifier(input.identifier);
    if (!account || account.loginType !== input.loginType) {
      throw new OtpAccountNotFoundException();
    }
    if (!account.canLogin) {
      throw new OtpAccountNotActiveException();
    }
    const { length, ttlSeconds } = this.config.get('otp');
    const now = new Date();
    const code = this.crypto.randomDigits(length);

    const otp = await this.unitOfWork.runInTransaction(async () => {
      const latest = await this.otps.findLatest(
        account.hashedIdentifier,
        EOtpPurpose.RESET_PASSWORD,
      );
      latest?.assertReplaceable(now);
      const issued = Otp.issue({
        sender: input.loginType,
        purpose: EOtpPurpose.RESET_PASSWORD,
        hashedIdentifier: account.hashedIdentifier,
        encryptedCode: this.crypto.encrypt(code),
        ttlSeconds,
        now,
      });
      await this.otps.save(issued);
      return issued;
    });

    await this.messageSender.send(
      buildOtpMessage(otp, account.identifier, code, now),
    );
  }
}
