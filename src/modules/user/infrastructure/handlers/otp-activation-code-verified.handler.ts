import { Injectable } from '@nestjs/common';
import { OnIntegrationEvent } from '@shared/event-bus';
import {
  OTP_ACTIVATION_CODE_VERIFIED_EVENT,
  TOtpActivationCodeVerifiedEvent,
} from '@modules/otp/contracts';
import { ActivateUserUseCase } from '../../application/use-cases';

/** A valid activation code was submitted: activate the account. */
@Injectable()
export class OtpActivationCodeVerifiedHandler {
  constructor(private readonly activateUser: ActivateUserUseCase) {}

  @OnIntegrationEvent(OTP_ACTIVATION_CODE_VERIFIED_EVENT)
  async handle(event: TOtpActivationCodeVerifiedEvent): Promise<void> {
    await this.activateUser.execute({ userId: event.payload.userId });
  }
}
