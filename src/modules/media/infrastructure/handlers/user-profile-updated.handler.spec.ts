import { createIntegrationEvent } from '@shared/event-bus';
import {
  TUserProfileUpdatedEventPayload,
  USER_PROFILE_UPDATED_EVENT,
} from '@modules/user/contracts';
import { ReplaceMediaUseCase } from '../../application/use-cases';
import { EMediaOwnerType, EMediaType } from '../../domain';
import { UserProfileUpdatedHandler } from './user-profile-updated.handler';

const file = (mediaId: string, type: 'IMAGE' | 'FILE') => ({
  mediaId,
  key: `tmp/u1/${mediaId}.png`,
  type,
  extension: 'png',
  filename: `${mediaId}.png`,
});

describe('UserProfileUpdatedHandler', () => {
  let replaceExecute: jest.Mock;
  let handler: UserProfileUpdatedHandler;

  const handle = (payload: Omit<TUserProfileUpdatedEventPayload, 'userId'>) =>
    handler.handle(
      createIntegrationEvent(USER_PROFILE_UPDATED_EVENT, {
        userId: 'u1',
        ...payload,
      }),
    );

  beforeEach(() => {
    replaceExecute = jest.fn().mockResolvedValue(undefined);
    handler = new UserProfileUpdatedHandler({
      execute: replaceExecute,
    } as unknown as ReplaceMediaUseCase);
  });

  it('replaces the avatar and the business license of the user', async () => {
    await handle({
      avatar: file('a1', 'IMAGE'),
      businessLicense: file('l1', 'FILE'),
    });

    expect(replaceExecute).toHaveBeenCalledTimes(2);
    expect(replaceExecute).toHaveBeenCalledWith({
      uploaderId: 'u1',
      ownerType: EMediaOwnerType.USER_AVATAR,
      ownerId: 'u1',
      file: {
        mediaId: 'a1',
        key: 'tmp/u1/a1.png',
        type: EMediaType.IMAGE,
        extension: 'png',
        filename: 'a1.png',
      },
    });
    expect(replaceExecute).toHaveBeenCalledWith({
      uploaderId: 'u1',
      ownerType: EMediaOwnerType.USER_LICENSE,
      ownerId: 'u1',
      file: {
        mediaId: 'l1',
        key: 'tmp/u1/l1.png',
        type: EMediaType.FILE,
        extension: 'png',
        filename: 'l1.png',
      },
    });
  });

  it('replaces only the file that is given', async () => {
    await handle({ avatar: file('a1', 'IMAGE') });

    expect(replaceExecute).toHaveBeenCalledTimes(1);
    expect(replaceExecute).toHaveBeenCalledWith(
      expect.objectContaining({ ownerType: EMediaOwnerType.USER_AVATAR }),
    );
  });

  it('does nothing when no file changed', async () => {
    await handle({});

    expect(replaceExecute).not.toHaveBeenCalled();
  });
});
