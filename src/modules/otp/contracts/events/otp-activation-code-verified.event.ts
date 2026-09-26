import { TIntegrationEvent } from '@shared/event-bus';

/** The user proved ownership of its identifier with a valid activation code. */
export const OTP_ACTIVATION_CODE_VERIFIED_EVENT =
  'otp.activation-code.verified';

export type TOtpActivationCodeVerifiedEventPayload = { userId: string };

export type TOtpActivationCodeVerifiedEvent = TIntegrationEvent<
  typeof OTP_ACTIVATION_CODE_VERIFIED_EVENT,
  TOtpActivationCodeVerifiedEventPayload
>;
