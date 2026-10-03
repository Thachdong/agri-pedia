import { TDomainEvent } from '@shared/domain';
import { ELoginType } from '../enums/login-type.enum';

export const USER_IDENTIFIER_VERIFICATION_REQUESTED =
  'UserIdentifierVerificationRequested';

export type TUserIdentifierVerificationRequestedPayload = {
  userId: string;
  loginType: ELoginType;
};

export type TUserIdentifierVerificationRequestedDomainEvent = TDomainEvent<
  typeof USER_IDENTIFIER_VERIFICATION_REQUESTED,
  TUserIdentifierVerificationRequestedPayload
>;

export const userIdentifierVerificationRequested = (
  payload: TUserIdentifierVerificationRequestedPayload,
): TUserIdentifierVerificationRequestedDomainEvent => ({
  name: USER_IDENTIFIER_VERIFICATION_REQUESTED,
  occurredAt: new Date(),
  payload,
});
