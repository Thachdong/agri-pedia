import { Inject, Injectable } from '@nestjs/common';
import { CRYPTO_SERVICE, ICryptoService } from '@shared/crypto';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../ports/refresh-token.repository';
import { IUserRepository, USER_REPOSITORY } from '../ports/user.repository';

export type TLogoutUserInput = {
  /** Caller, from the access token. */
  userId: string;
  refreshToken: string;
};

@Injectable()
export class LogoutUserUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: IRefreshTokenRepository,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(CRYPTO_SERVICE) private readonly crypto: ICryptoService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  /**
   * Ends the session the refresh token belongs to: its whole family is revoked.
   * Unknown token or a token of another user: nothing happens, no error.
   */
  async execute(input: TLogoutUserInput): Promise<void> {
    const hashedToken = this.crypto.hash(input.refreshToken);

    await this.unitOfWork.runInTransaction(async () => {
      const token =
        await this.refreshTokens.findByHashedTokenForUpdate(hashedToken);
      if (!token) {
        return;
      }
      const caller = await this.users.findById(input.userId);
      if (caller?.hashedIdentifier !== token.hashedIdentifier) {
        return;
      }
      await this.refreshTokens.revokeFamily(token.familyId);
    });
  }
}
