import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { CRYPTO_SERVICE, ICryptoService } from '@shared/crypto';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  createIntegrationEvent,
  EVENT_BUS,
  IEventBus,
} from '@shared/event-bus';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import {
  OTP_PASSWORD_RESET_CODE_VERIFIED_EVENT,
  TOtpPasswordResetCodeVerifiedEventPayload,
} from '../../contracts';
import {
  EOtpPurpose,
  OtpBlockedException,
  OtpInvalidCodeException,
  OtpNotFoundException,
} from '../../domain';
import { IOtpRepository, OTP_REPOSITORY } from '../ports/otp.repository';

export type TVerifyPasswordResetOtpInput = {
  /** Raw identifier as typed by the client. */
  identifier: string;
  code: string;
  newPassword: string;
};

/**
 * Checks the password reset code of an identifier and consumes it, then hands the
 * hashed new password to the user module (`otp.password-reset-code.verified`).
 */
@Injectable()
export class VerifyPasswordResetOtpUseCase {
  constructor(
    @Inject(OTP_REPOSITORY) private readonly otps: IOtpRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(CRYPTO_SERVICE) private readonly crypto: ICryptoService,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(input: TVerifyPasswordResetOtpInput): Promise<void> {
    const account = await this.userQuery.findByIdentifier(input.identifier);
    if (!account) {
      throw new OtpNotFoundException();
    }
    const { maxWrongCount, wrongBlockSeconds } = this.config.get('otp');

    // A wrong attempt must be committed before failing, so the error is thrown after the transaction.
    const { result, blockUntil } = await this.unitOfWork.runInTransaction(
      async () => {
        const otp = await this.otps.findLatest(
          account.hashedIdentifier,
          EOtpPurpose.RESET_PASSWORD,
        );
        if (!otp) {
          throw new OtpNotFoundException();
        }
        const verifyResult = otp.verify(
          input.code,
          this.crypto.decrypt(otp.encryptedCode),
          new Date(),
          { maxWrongCount, wrongBlockSeconds },
        );
        await this.otps.save(otp);
        return { result: verifyResult, blockUntil: otp.blockUntil };
      },
    );

    if (result === 'WRONG_CODE') {
      throw new OtpInvalidCodeException();
    }
    if (result === 'BLOCKED') {
      throw new OtpBlockedException(blockUntil!);
    }

    await this.eventBus.publish(
      createIntegrationEvent<
        typeof OTP_PASSWORD_RESET_CODE_VERIFIED_EVENT,
        TOtpPasswordResetCodeVerifiedEventPayload
      >(OTP_PASSWORD_RESET_CODE_VERIFIED_EVENT, {
        userId: account.userId,
        passwordHash: await this.crypto.hashPassword(input.newPassword),
      }),
    );
  }
}
