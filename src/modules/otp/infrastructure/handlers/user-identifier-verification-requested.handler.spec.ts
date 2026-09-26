import { createIntegrationEvent } from '@shared/event-bus';
import {
  TUserIdentifierVerificationRequestedEventPayload,
  USER_IDENTIFIER_VERIFICATION_REQUESTED_EVENT,
} from '@modules/user/contracts';
import { IssueOtpUseCase } from '../../application/use-cases';
import { EOtpPurpose, EOtpSender } from '../../domain';
import { UserIdentifierVerificationRequestedHandler } from './user-identifier-verification-requested.handler';

const eventOf = (payload: TUserIdentifierVerificationRequestedEventPayload) =>
  createIntegrationEvent(USER_IDENTIFIER_VERIFICATION_REQUESTED_EVENT, payload);

describe('UserIdentifierVerificationRequestedHandler', () => {
  let execute: jest.Mock;
  let handler: UserIdentifierVerificationRequestedHandler;

  beforeEach(() => {
    execute = jest.fn().mockResolvedValue(undefined);
    handler = new UserIdentifierVerificationRequestedHandler({
      execute,
    } as unknown as IssueOtpUseCase);
  });

  it('issues an activation otp by phone', async () => {
    await handler.handle(
      eventOf({
        userId: 'user-1',
        loginType: 'PHONE',
        identifier: '0912345678',
      }),
    );
    expect(execute).toHaveBeenCalledWith({
      sender: EOtpSender.PHONE,
      purpose: EOtpPurpose.ACTIVATE_DISTRIBUTOR,
      identifier: '0912345678',
    });
  });

  it('issues an activation otp by email', async () => {
    await handler.handle(
      eventOf({ userId: 'user-1', loginType: 'EMAIL', identifier: 'a@b.com' }),
    );
    expect(execute).toHaveBeenCalledWith({
      sender: EOtpSender.EMAIL,
      purpose: EOtpPurpose.ACTIVATE_DISTRIBUTOR,
      identifier: 'a@b.com',
    });
  });
});
