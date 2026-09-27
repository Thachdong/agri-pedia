import { Inject, Injectable } from '@nestjs/common';
import { CRYPTO_SERVICE, ICryptoService } from '@shared/crypto';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { UserNotFoundException, WrongPasswordException } from '../../domain';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../ports/refresh-token.repository';
import { IUserRepository, USER_REPOSITORY } from '../ports/user.repository';

export type TChangePasswordInput = {
  /** Caller, from the access token. */
  userId: string;
  oldPassword: string;
  newPassword: string;
};

/** Logged-in user replaces their password after proving the current one; every session of the user ends. */
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: IRefreshTokenRepository,
    @Inject(CRYPTO_SERVICE) private readonly crypto: ICryptoService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TChangePasswordInput): Promise<void> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new UserNotFoundException(input.userId);
    }
    if (
      !(await this.crypto.verifyPassword(input.oldPassword, user.passwordHash))
    ) {
      throw new WrongPasswordException();
    }
    // Slow password hashing stays outside the transaction.
    user.changePassword(await this.crypto.hashPassword(input.newPassword));

    await this.unitOfWork.runInTransaction(async () => {
      await this.users.save(user);
      await this.refreshTokens.revokeAllByHashedIdentifier(
        user.hashedIdentifier,
      );
    });
  }
}
