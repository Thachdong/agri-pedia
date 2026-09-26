import { IConfigService } from '@shared/config';
import { InMemoryCryptoService } from '@shared/crypto';
import { InMemoryUnitOfWork } from '@shared/database';
import { EMessageChannel, InMemoryMessageSender } from '@shared/messaging';
import { IUserQueryPort } from '@modules/user/contracts';
import {
  EOtpBlockReason,
  EOtpPurpose,
  EOtpSender,
  Otp,
  OtpAlreadyConsumedException,
  OtpBlockedException,
  OtpNotFoundException,
} from '../../domain';
import { InMemoryOtpRepository } from '../ports/fakes';
import { ResendActivationOtpUseCase } from './resend-activation-otp.use-case';

const HASH = 'hash(0912345678)';

const config = {
  get: () => ({
    length: 6,
    ttlSeconds: 300,
    maxRetryCount: 2,
    retryBlockSeconds: 3600,
  }),
} as unknown as IConfigService;

const ago = (seconds: number) => new Date(Date.now() - seconds * 1000);

const issue = (issuedSecondsAgo = 0) =>
  Otp.issue({
    sender: EOtpSender.PHONE,
    purpose: EOtpPurpose.ACTIVATE_DISTRIBUTOR,
    hashedIdentifier: HASH,
    encryptedCode: 'enc(482913)',
    ttlSeconds: 300,
    now: ago(issuedSecondsAgo),
  });

describe('ResendActivationOtpUseCase', () => {
  let otps: InMemoryOtpRepository;
  let crypto: InMemoryCryptoService;
  let messageSender: InMemoryMessageSender;
  let useCase: ResendActivationOtpUseCase;

  beforeEach(() => {
    otps = new InMemoryOtpRepository();
    crypto = new InMemoryCryptoService();
    crypto.nextDigits = '777111';
    messageSender = new InMemoryMessageSender();
    const userQuery: IUserQueryPort = {
      findByIdentifier: async (identifier) =>
        identifier === '0912 345 678'
          ? {
              userId: 'user-1',
              identifier: '0912345678',
              hashedIdentifier: HASH,
            }
          : null,
    };
    useCase = new ResendActivationOtpUseCase(
      otps,
      userQuery,
      crypto,
      messageSender,
      config,
      new InMemoryUnitOfWork(),
    );
  });

  const resend = () => useCase.execute({ identifier: '0912 345 678' });

  it('sends the same code again and counts the resend', async () => {
    const otp = issue(60);
    await otps.save(otp);

    await resend();

    expect(otp.retryCount).toBe(1);
    expect(otps.items.size).toBe(1);
    expect(messageSender.sent).toEqual([
      {
        channel: EMessageChannel.PHONE,
        to: '0912345678',
        subject: expect.any(String),
        body: expect.stringContaining('482913'),
      },
    ]);
    expect(messageSender.sent[0].body).toContain('4 phút');
  });

  it('blocks once the resend limit is exceeded, without sending', async () => {
    const otp = issue();
    await otps.save(otp);
    await resend();
    await resend();

    await expect(resend()).rejects.toThrow(OtpBlockedException);

    expect(otp.blockReason).toBe(EOtpBlockReason.RETRY_COUNT_MAXIMUM);
    expect(messageSender.sent).toHaveLength(2);
    await expect(resend()).rejects.toThrow(OtpBlockedException);
  });

  it('issues and sends a new code when the latest one expired', async () => {
    const expired = issue(301);
    await otps.save(expired);

    await resend();

    expect(otps.items.size).toBe(2);
    const renewed = [...otps.items.values()].find((o) => o !== expired)!;
    expect(renewed.encryptedCode).toBe('enc(777111)');
    expect(renewed.sender).toBe(EOtpSender.PHONE);
    expect(renewed.retryCount).toBe(0);
    expect(expired.retryCount).toBe(0);
    expect(messageSender.sent[0].body).toContain('777111');
    expect(messageSender.sent[0].body).toContain('5 phút');
  });

  it('stays blocked when the latest one expired during the block', async () => {
    await otps.save(
      Otp.restore('otp-1', {
        sender: EOtpSender.PHONE,
        purpose: EOtpPurpose.ACTIVATE_DISTRIBUTOR,
        hashedIdentifier: HASH,
        encryptedCode: 'enc(482913)',
        retryCount: 3,
        wrongCount: 0,
        issuedAt: ago(600),
        expiredAt: ago(300),
        isConsumed: false,
        blockUntil: new Date(Date.now() + 60_000),
        blockReason: EOtpBlockReason.RETRY_COUNT_MAXIMUM,
      }),
    );

    await expect(resend()).rejects.toThrow(OtpBlockedException);
    expect(otps.items.size).toBe(1);
    expect(messageSender.sent).toEqual([]);
  });

  it('rejects a consumed otp', async () => {
    const otp = issue();
    otp.verify('482913', '482913', new Date(), {
      maxWrongCount: 5,
      wrongBlockSeconds: 900,
    });
    await otps.save(otp);

    await expect(resend()).rejects.toThrow(OtpAlreadyConsumedException);
    expect(messageSender.sent).toEqual([]);
  });

  it('throws OtpNotFound for an unknown identifier or no otp', async () => {
    await expect(
      useCase.execute({ identifier: 'nobody@mail.com' }),
    ).rejects.toThrow(OtpNotFoundException);
    await expect(resend()).rejects.toThrow(OtpNotFoundException);
  });
});
