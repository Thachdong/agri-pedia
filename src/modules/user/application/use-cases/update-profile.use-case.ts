import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { EBusinessType, UserNotFoundException } from '../../domain';
import { IUserRepository, USER_REPOSITORY } from '../ports/user.repository';

/** File already uploaded to TMP; moved and recorded by the media module. */
export type TUpdateProfileFile = {
  key: string;
  type: string;
  extension: string;
  filename: string;
};

export type TUpdateProfileInput = {
  /** Caller, from the access token. */
  userId: string;
  username?: string;
  bio?: string;
  businessType?: EBusinessType | null;
  avatar?: TUpdateProfileFile;
  businessLicense?: TUpdateProfileFile;
};

export type TUpdateProfileOutput = {
  username: string;
  /** Media id. */
  avatar: string | null;
  bio: string | null;
  /** Media id. */
  businessLicense: string | null;
  businessType: EBusinessType | null;
  updatedAt: Date;
};

/**
 * Changes the caller's profile; omitted fields are kept.
 * A new avatar / business license gets its media id here, so the user references it at once.
 */
@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TUpdateProfileInput): Promise<TUpdateProfileOutput> {
    const user = await this.unitOfWork.runInTransaction(async () => {
      const found = await this.users.findById(input.userId);
      if (!found) {
        throw new UserNotFoundException(input.userId);
      }
      found.updateProfile({
        username: input.username,
        bio: input.bio,
        businessType: input.businessType,
        avatar: input.avatar ? randomUUID() : undefined,
        businessLicense: input.businessLicense ? randomUUID() : undefined,
      });
      await this.users.save(found);
      return found;
    });

    return {
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      businessLicense: user.businessLicense,
      businessType: user.businessType,
      updatedAt: user.updatedAt,
    };
  }
}
