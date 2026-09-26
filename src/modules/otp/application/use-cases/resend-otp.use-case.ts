import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { CRYPTO_SERVICE, ICryptoService } from '@shared/crypto';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { IMessageSender, MESSAGE_SENDER } from '@shared/messaging';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import {
  EOtpPurpose,
  Otp,
  OtpBlockedException,
  OtpNotFoundException,
} from '../../domain';
import { IOtpRepository, OTP_REPOSITORY } from '../ports/otp.repository';
import { buildOtpMessage } from '../services/otp-message.builder';

export type TResendOtpInput = {
  /** Raw identifier as typed by the client. */
  identifier: string;
  purpose: EOtpPurpose;
};

/**
 * Sends the latest code of `purpose` again. An expired code (not blocked) is replaced by a new one;
 * otherwise the same code is sent, counted against the resend limit.
 */
@Injectable()
export class ResendOtpUseCase {
  constructor(
    @Inject(OTP_REPOSITORY) private readonly otps: IOtpRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(CRYPTO_SERVICE) private readonly crypto: ICryptoService,
    @Inject(MESSAGE_SENDER) private readonly messageSender: IMessageSender,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TResendOtpInput): Promise<void> {
    const user = await this.userQuery.findByIdentifier(input.identifier);
    if (!user) {
      throw new OtpNotFoundException();
    }
    const { length, ttlSeconds, maxRetryCount, retryBlockSeconds } =
      this.config.get('otp');
    const now = new Date();

    // A counted resend (and a block) must be committed before failing, so errors are thrown after the transaction.
    const outcome = await this.unitOfWork.runInTransaction(async () => {
      const latest = await this.otps.findLatest(
        user.hashedIdentifier,
        input.purpose,
      );
      if (!latest) {
        throw new OtpNotFoundException();
      }
      const result = latest.resend(now, { maxRetryCount, retryBlockSeconds });
      if (result === 'EXPIRED') {
        const code = this.crypto.randomDigits(length);
        const renewed = Otp.issue({
          sender: latest.sender,
          purpose: input.purpose,
          hashedIdentifier: user.hashedIdentifier,
          encryptedCode: this.crypto.encrypt(code),
          ttlSeconds,
          now,
        });
        await this.otps.save(renewed);
        return { result, otp: renewed, code };
      }
      await this.otps.save(latest);
      return { result, otp: latest, code: null };
    });

    if (outcome.result === 'BLOCKED') {
      throw new OtpBlockedException(outcome.otp.blockUntil!);
    }
    const code = outcome.code ?? this.crypto.decrypt(outcome.otp.encryptedCode);
    await this.messageSender.send(
      buildOtpMessage(outcome.otp, user.identifier, code, now),
    );
  }
}
