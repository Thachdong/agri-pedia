import { IConfigService } from '@shared/config';
import { InMemoryCryptoService } from '@shared/crypto';
import { InMemoryUnitOfWork } from '@shared/database';
import { EMessageChannel, InMemoryMessageSender } from '@shared/messaging';
import { EOtpPurpose, EOtpSender } from '../../domain';
import { InMemoryOtpRepository } from '../ports/fakes';
import { IssueOtpUseCase } from './issue-otp.use-case';

const config = {
  get: () => ({ length: 6, ttlSeconds: 300 }),
} as unknown as IConfigService;

describe('IssueOtpUseCase', () => {
  let otps: InMemoryOtpRepository;
  let crypto: InMemoryCryptoService;
  let messageSender: InMemoryMessageSender;
  let useCase: IssueOtpUseCase;

  beforeEach(() => {
    otps = new InMemoryOtpRepository();
    crypto = new InMemoryCryptoService();
    crypto.nextDigits = '482913';
    messageSender = new InMemoryMessageSender();
    useCase = new IssueOtpUseCase(
      otps,
      crypto,
      messageSender,
      config,
      new InMemoryUnitOfWork(),
    );
  });

  it('stores an encrypted code for the hashed identifier and sends it', async () => {
    const before = Date.now();
    const { otpId, expiredAt } = await useCase.execute({
      sender: EOtpSender.EMAIL,
      purpose: EOtpPurpose.ACTIVATE_DISTRIBUTOR,
      identifier: 'shop@mail.com',
    });

    const otp = otps.items.get(otpId)!;
    expect(otp.hashedIdentifier).toBe('hash(shop@mail.com)');
    expect(otp.encryptedCode).toBe('enc(482913)');
    expect(otp.purpose).toBe(EOtpPurpose.ACTIVATE_DISTRIBUTOR);
    expect(otp.expiredAt.getTime() - otp.issuedAt.getTime()).toBe(300_000);
    expect(otp.issuedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(expiredAt).toBe(otp.expiredAt.toISOString());

    expect(messageSender.sent).toEqual([
      {
        channel: EMessageChannel.EMAIL,
        to: 'shop@mail.com',
        subject: expect.any(String),
        body: expect.stringContaining('482913'),
      },
    ]);
  });

  it('sends by phone channel for PHONE sender', async () => {
    await useCase.execute({
      sender: EOtpSender.PHONE,
      purpose: EOtpPurpose.RESET_PASSWORD,
      identifier: '0912345678',
    });
    expect(messageSender.sent[0].channel).toBe(EMessageChannel.PHONE);
  });

  it('keeps the stored otp when sending fails (resend can recover)', async () => {
    messageSender.failWith = new Error('provider down');
    await expect(
      useCase.execute({
        sender: EOtpSender.EMAIL,
        purpose: EOtpPurpose.ACTIVATE_DISTRIBUTOR,
        identifier: 'shop@mail.com',
      }),
    ).rejects.toThrow('provider down');
    expect(otps.items.size).toBe(1);
  });
});
