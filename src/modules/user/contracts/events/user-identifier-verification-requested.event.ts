import { TIntegrationEvent } from '@shared/event-bus';

/** The user must prove ownership of its identifier (e.g. new DISTRIBUTOR). */
export const USER_IDENTIFIER_VERIFICATION_REQUESTED_EVENT =
  'user.identifier.verification-requested';

export type TUserIdentifierVerificationRequestedEventPayload = {
  userId: string;
  loginType: 'EMAIL' | 'PHONE';
  /** Plain identifier in normalized form (email lowercase, phone digits). Hashing it gives the stored hash. */
  identifier: string;
};

export type TUserIdentifierVerificationRequestedEvent = TIntegrationEvent<
  typeof USER_IDENTIFIER_VERIFICATION_REQUESTED_EVENT,
  TUserIdentifierVerificationRequestedEventPayload
>;
