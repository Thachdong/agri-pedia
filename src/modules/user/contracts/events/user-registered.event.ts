import { TIntegrationEvent } from '@shared/event-bus';

export const USER_REGISTERED_EVENT = 'user.account.registered';

export type TUserRegisteredEventPayload = {
  userId: string;
  loginType: 'EMAIL' | 'PHONE';
  /** Plain identifier in normalized form (email lowercase, phone digits). Hashing it gives the stored hash. */
  identifier: string;
  role: 'FARMER' | 'DISTRIBUTOR';
  status: 'PENDING' | 'ACTIVE';
};

export type TUserRegisteredEvent = TIntegrationEvent<
  typeof USER_REGISTERED_EVENT,
  TUserRegisteredEventPayload
>;
