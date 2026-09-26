import { Inject, Injectable } from '@nestjs/common';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { UserNotFoundException } from '../../domain';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../ports/refresh-token.repository';
import { IUserRepository, USER_REPOSITORY } from '../ports/user.repository';

export type TResetPasswordInput = {
  userId: string;
  /** Already hashed; the plain password never reaches this module. */
  passwordHash: string;
};

/** Sets a new password after the reset code was verified and ends every session of the user. */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: IRefreshTokenRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TResetPasswordInput): Promise<void> {
    await this.unitOfWork.runInTransaction(async () => {
      const user = await this.users.findById(input.userId);
      if (!user) {
        throw new UserNotFoundException(input.userId);
      }
      user.changePassword(input.passwordHash);
      await this.users.save(user);
      await this.refreshTokens.revokeAllByHashedIdentifier(
        user.hashedIdentifier,
      );
    });
  }
}
