import { Inject, Injectable } from '@nestjs/common';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { UserNotFoundException } from '../../domain';
import { IUserRepository, USER_REPOSITORY } from '../ports/user.repository';

export type TActivateUserInput = { userId: string };

/** Marks the user's identifier as verified. Idempotent for an already active user. */
@Injectable()
export class ActivateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TActivateUserInput): Promise<void> {
    await this.unitOfWork.runInTransaction(async () => {
      const user = await this.users.findById(input.userId);
      if (!user) {
        throw new UserNotFoundException(input.userId);
      }
      user.activate();
      await this.users.save(user);
    });
  }
}
