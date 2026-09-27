import { Injectable } from '@nestjs/common';
import { OnIntegrationEvent } from '@shared/event-bus';
import {
  TUserProfileUpdatedEvent,
  TUserProfileUpdatedFilePayload,
  USER_PROFILE_UPDATED_EVENT,
} from '@modules/user/contracts';
import { ReplaceMediaUseCase } from '../../application/use-cases';
import { EMediaOwnerType, EMediaType } from '../../domain';

@Injectable()
export class UserProfileUpdatedHandler {
  constructor(private readonly replaceMedia: ReplaceMediaUseCase) {}

  @OnIntegrationEvent(USER_PROFILE_UPDATED_EVENT)
  async handle(event: TUserProfileUpdatedEvent): Promise<void> {
    const { userId, avatar, businessLicense } = event.payload;
    const replace = (
      ownerType: EMediaOwnerType,
      file: TUserProfileUpdatedFilePayload,
    ) =>
      this.replaceMedia.execute({
        uploaderId: userId,
        ownerType,
        ownerId: userId,
        file: {
          mediaId: file.mediaId,
          key: file.key,
          type: file.type as EMediaType,
          extension: file.extension,
          filename: file.filename,
        },
      });

    const tasks: Promise<void>[] = [];
    if (avatar) {
      tasks.push(replace(EMediaOwnerType.USER_AVATAR, avatar));
    }
    if (businessLicense) {
      tasks.push(replace(EMediaOwnerType.USER_LICENSE, businessLicense));
    }
    await Promise.all(tasks);
  }
}
