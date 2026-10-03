import { TIntegrationEvent } from '@shared/event-bus';

/** A user changed their profile; a new avatar / business license is still in TMP and must be confirmed under the given media id. */
export const USER_PROFILE_UPDATED_EVENT = 'user.profile.updated';

/** TMP file returned by presign, plus the media id the user already references. */
export type TUserProfileUpdatedFilePayload = {
  mediaId: string;
  key: string;
  type: 'IMAGE' | 'VIDEO' | 'FILE';
  extension: string;
  filename: string;
};

export type TUserProfileUpdatedEventPayload = {
  /** Also the uploader of the TMP files. */
  userId: string;
  /** Absent: avatar unchanged. */
  avatar?: TUserProfileUpdatedFilePayload;
  /** Absent: business license unchanged. */
  businessLicense?: TUserProfileUpdatedFilePayload;
};

export type TUserProfileUpdatedEvent = TIntegrationEvent<
  typeof USER_PROFILE_UPDATED_EVENT,
  TUserProfileUpdatedEventPayload
>;
