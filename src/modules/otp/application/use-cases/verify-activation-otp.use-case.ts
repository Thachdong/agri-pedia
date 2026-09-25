import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { CRYPTO_SERVICE, ICryptoService } from '@shared/crypto';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import {
  EOtpPurpose,
  OtpBlockedException,
  OtpInvalidCodeException,
  OtpNotFoundException,
} from '../../domain';
import { IOtpRepository, OTP_REPOSITORY } from '../ports/otp.repository';

export type TVerifyActivationOtpInput = {
  /** Raw identifier as typed by the client. */
  identifier: string;
  code: string;
};

/** Checks the activation code of a registered identifier and consumes it. */
@Injectable()
export class VerifyActivationOtpUseCase {
  constructor(
    @Inject(OTP_REPOSITORY) private readonly otps: IOtpRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(CRYPTO_SERVICE) private readonly crypto: ICryptoService,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TVerifyActivationOtpInput): Promise<void> {
    const user = await this.userQuery.findByIdentifier(input.identifier);
    if (!user) {
      throw new OtpNotFoundException();
    }
    const { maxWrongCount, wrongBlockSeconds } = this.config.get('otp');

    // A wrong attempt must be committed before failing, so the error is thrown after the transaction.
    const { result, blockUntil } = await this.unitOfWork.runInTransaction(
      async () => {
        const otp = await this.otps.findLatest(
          user.hashedIdentifier,
          EOtpPurpose.ACTIVATE_DISTRIBUTOR,
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
  }
}
