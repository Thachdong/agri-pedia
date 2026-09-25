import { Injectable } from '@nestjs/common';
import { OnIntegrationEvent } from '@shared/event-bus';
import {
  TUserRegisteredEvent,
  TUserRegisteredEventPayload,
  USER_REGISTERED_EVENT,
} from '@modules/user/contracts';
import { IssueOtpUseCase } from '../../application/use-cases';
import { EOtpPurpose, EOtpSender } from '../../domain';

const SENDER_BY_LOGIN_TYPE: Record<
  TUserRegisteredEventPayload['loginType'],
  EOtpSender
> = {
  EMAIL: EOtpSender.EMAIL,
  PHONE: EOtpSender.PHONE,
};

/** A newly registered distributor must verify its identifier: issue an activation code. */
@Injectable()
export class UserRegisteredHandler {
  constructor(private readonly issueOtp: IssueOtpUseCase) {}

  @OnIntegrationEvent(USER_REGISTERED_EVENT)
  async handle(event: TUserRegisteredEvent): Promise<void> {
    if (event.payload.role !== 'DISTRIBUTOR') {
      return;
    }
    await this.issueOtp.execute({
      sender: SENDER_BY_LOGIN_TYPE[event.payload.loginType],
      purpose: EOtpPurpose.ACTIVATE_DISTRIBUTOR,
      identifier: event.payload.identifier,
    });
  }
}
