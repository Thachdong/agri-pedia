import { Injectable } from '@nestjs/common';
import { OnIntegrationEvent } from '@shared/event-bus';
import {
  OTP_PASSWORD_RESET_CODE_VERIFIED_EVENT,
  TOtpPasswordResetCodeVerifiedEvent,
} from '@modules/otp/contracts';
import { ResetPasswordUseCase } from '../../application/use-cases';

/** A valid password reset code was submitted: set the new password. */
@Injectable()
export class OtpPasswordResetCodeVerifiedHandler {
  constructor(private readonly resetPassword: ResetPasswordUseCase) {}

  @OnIntegrationEvent(OTP_PASSWORD_RESET_CODE_VERIFIED_EVENT)
  async handle(event: TOtpPasswordResetCodeVerifiedEvent): Promise<void> {
    await this.resetPassword.execute({
      userId: event.payload.userId,
      passwordHash: event.payload.passwordHash,
    });
  }
}
