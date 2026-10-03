import { createIntegrationEvent } from '@shared/event-bus';
import { OTP_PASSWORD_RESET_CODE_VERIFIED_EVENT } from '@modules/otp/contracts';
import { ResetPasswordUseCase } from '../../application/use-cases';
import { OtpPasswordResetCodeVerifiedHandler } from './otp-password-reset-code-verified.handler';

describe('OtpPasswordResetCodeVerifiedHandler', () => {
  it('sets the new password of the event user', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const handler = new OtpPasswordResetCodeVerifiedHandler({
      execute,
    } as unknown as ResetPasswordUseCase);

    await handler.handle(
      createIntegrationEvent(OTP_PASSWORD_RESET_CODE_VERIFIED_EVENT, {
        userId: 'user-1',
        passwordHash: 'pwd(new-secret)',
      }),
    );

    expect(execute).toHaveBeenCalledWith({
      userId: 'user-1',
      passwordHash: 'pwd(new-secret)',
    });
  });
});
