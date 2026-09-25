import { TDomainEvent } from '@shared/domain';
import { ELoginType } from '../enums/login-type.enum';
import { EUserRole } from '../enums/user-role.enum';
import { EUserStatus } from '../enums/user-status.enum';

export const USER_REGISTERED = 'UserRegistered';

export type TUserRegisteredPayload = {
  userId: string;
  loginType: ELoginType;
  role: EUserRole;
  status: EUserStatus;
};

export type TUserRegisteredDomainEvent = TDomainEvent<
  typeof USER_REGISTERED,
  TUserRegisteredPayload
>;

export const userRegistered = (
  payload: TUserRegisteredPayload,
): TUserRegisteredDomainEvent => ({
  name: USER_REGISTERED,
  occurredAt: new Date(),
  payload,
});
