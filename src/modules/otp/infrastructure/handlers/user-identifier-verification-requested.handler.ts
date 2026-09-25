import { Injectable } from '@nestjs/common';
import { OnIntegrationEvent } from '@shared/event-bus';
import {
  TUserIdentifierVerificationRequestedEvent,
  TUserIdentifierVerificationRequestedEventPayload,
  USER_IDENTIFIER_VERIFICATION_REQUESTED_EVENT,
} from '@modules/user/contracts';
import { IssueOtpUseCase } from '../../application/use-cases';
import { EOtpPurpose, EOtpSender } from '../../domain';

const SENDER_BY_LOGIN_TYPE: Record<
  TUserIdentifierVerificationRequestedEventPayload['loginType'],
  EOtpSender
> = {
  EMAIL: EOtpSender.EMAIL,
  PHONE: EOtpSender.PHONE,
};

/** Sends an activation code to the identifier the user module asked to verify. */
@Injectable()
export class UserIdentifierVerificationRequestedHandler {
  constructor(private readonly issueOtp: IssueOtpUseCase) {}

  @OnIntegrationEvent(USER_IDENTIFIER_VERIFICATION_REQUESTED_EVENT)
  async handle(
    event: TUserIdentifierVerificationRequestedEvent,
  ): Promise<void> {
    await this.issueOtp.execute({
      sender: SENDER_BY_LOGIN_TYPE[event.payload.loginType],
      purpose: EOtpPurpose.ACTIVATE_DISTRIBUTOR,
      identifier: event.payload.identifier,
    });
  }
}
