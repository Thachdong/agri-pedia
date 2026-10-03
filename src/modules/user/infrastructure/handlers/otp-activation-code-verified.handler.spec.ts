import { createIntegrationEvent } from '@shared/event-bus';
import { OTP_ACTIVATION_CODE_VERIFIED_EVENT } from '@modules/otp/contracts';
import { ActivateUserUseCase } from '../../application/use-cases';
import { OtpActivationCodeVerifiedHandler } from './otp-activation-code-verified.handler';

describe('OtpActivationCodeVerifiedHandler', () => {
  it('activates the user of the event', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const handler = new OtpActivationCodeVerifiedHandler({
      execute,
    } as unknown as ActivateUserUseCase);

    await handler.handle(
      createIntegrationEvent(OTP_ACTIVATION_CODE_VERIFIED_EVENT, {
        userId: 'user-1',
      }),
    );

    expect(execute).toHaveBeenCalledWith({ userId: 'user-1' });
  });
});
