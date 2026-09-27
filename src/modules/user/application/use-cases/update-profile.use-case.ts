import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  createIntegrationEvent,
  EVENT_BUS,
  IEventBus,
} from '@shared/event-bus';
import {
  TUserProfileUpdatedFilePayload,
  USER_PROFILE_UPDATED_EVENT,
} from '../../contracts';
import { EBusinessType, UserNotFoundException } from '../../domain';
import { IUserRepository, USER_REPOSITORY } from '../ports/user.repository';

/** File already uploaded to TMP; moved and recorded by the media module. */
export type TUpdateProfileFile = Omit<
  TUserProfileUpdatedFilePayload,
  'mediaId'
>;

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
 * A new avatar / business license gets its media id here, so the user references it at once;
 * the media module moves the file and records it under that id after the event.
 */
@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(input: TUpdateProfileInput): Promise<TUpdateProfileOutput> {
    const avatar = input.avatar && { ...input.avatar, mediaId: randomUUID() };
    const businessLicense = input.businessLicense && {
      ...input.businessLicense,
      mediaId: randomUUID(),
    };

    const user = await this.unitOfWork.runInTransaction(async () => {
      const found = await this.users.findById(input.userId);
      if (!found) {
        throw new UserNotFoundException(input.userId);
      }
      found.updateProfile({
        username: input.username,
        bio: input.bio,
        businessType: input.businessType,
        avatar: avatar?.mediaId,
        businessLicense: businessLicense?.mediaId,
      });
      await this.users.save(found);
      return found;
    });

    await this.eventBus.publish(
      createIntegrationEvent(USER_PROFILE_UPDATED_EVENT, {
        userId: user.id,
        avatar,
        businessLicense,
      }),
    );

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
