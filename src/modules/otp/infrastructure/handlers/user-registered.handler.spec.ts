import { createIntegrationEvent } from '@shared/event-bus';
import {
  TUserRegisteredEventPayload,
  USER_REGISTERED_EVENT,
} from '@modules/user/contracts';
import { IssueOtpUseCase } from '../../application/use-cases';
import { EOtpPurpose, EOtpSender } from '../../domain';
import { UserRegisteredHandler } from './user-registered.handler';

const eventOf = (payload: Partial<TUserRegisteredEventPayload>) =>
  createIntegrationEvent(USER_REGISTERED_EVENT, {
    userId: 'user-1',
    loginType: 'PHONE',
    identifier: '0912345678',
    role: 'DISTRIBUTOR',
    status: 'PENDING',
    ...payload,
  } as TUserRegisteredEventPayload);

describe('UserRegisteredHandler', () => {
  let execute: jest.Mock;
  let handler: UserRegisteredHandler;

  beforeEach(() => {
    execute = jest.fn().mockResolvedValue(undefined);
    handler = new UserRegisteredHandler({
      execute,
    } as unknown as IssueOtpUseCase);
  });

  it('issues an activation otp for a distributor', async () => {
    await handler.handle(eventOf({}));
    expect(execute).toHaveBeenCalledWith({
      sender: EOtpSender.PHONE,
      purpose: EOtpPurpose.ACTIVATE_DISTRIBUTOR,
      identifier: '0912345678',
    });
  });

  it('maps EMAIL login type to EMAIL sender', async () => {
    await handler.handle(
      eventOf({ loginType: 'EMAIL', identifier: 'a@b.com' }),
    );
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sender: EOtpSender.EMAIL,
        identifier: 'a@b.com',
      }),
    );
  });

  it('ignores farmers', async () => {
    await handler.handle(eventOf({ role: 'FARMER', status: 'ACTIVE' }));
    expect(execute).not.toHaveBeenCalled();
  });
});
