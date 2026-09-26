import { TIntegrationEvent } from '@shared/event-bus';

/** The user proved ownership of its identifier with a valid password reset code. */
export const OTP_PASSWORD_RESET_CODE_VERIFIED_EVENT =
  'otp.password-reset-code.verified';

export type TOtpPasswordResetCodeVerifiedEventPayload = {
  userId: string;
  /** New password, already hashed (ICryptoService.hashPassword); the plain one is never published. */
  passwordHash: string;
};

export type TOtpPasswordResetCodeVerifiedEvent = TIntegrationEvent<
  typeof OTP_PASSWORD_RESET_CODE_VERIFIED_EVENT,
  TOtpPasswordResetCodeVerifiedEventPayload
>;
