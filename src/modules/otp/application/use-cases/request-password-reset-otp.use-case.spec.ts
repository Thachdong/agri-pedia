import { IConfigService } from '@shared/config';
import { InMemoryCryptoService } from '@shared/crypto';
import { InMemoryUnitOfWork } from '@shared/database';
import { EMessageChannel, InMemoryMessageSender } from '@shared/messaging';
import {
  IUserQueryPort,
  TUserIdentifierSummary,
} from '@modules/user/contracts';
import {
  EOtpBlockReason,
  EOtpPurpose,
  EOtpSender,
  Otp,
  OtpAccountNotActiveException,
  OtpAccountNotFoundException,
  OtpAlreadyRequestedException,
  OtpBlockedException,
  TOtpProps,
} from '../../domain';
import { InMemoryOtpRepository } from '../ports/fakes';
import { RequestPasswordResetOtpUseCase } from './request-password-reset-otp.use-case';

const HASH = 'hash(farmer@mail.com)';

const config = {
  get: () => ({ length: 6, ttlSeconds: 300 }),
} as unknown as IConfigService;

const ago = (seconds: number) => new Date(Date.now() - seconds * 1000);
const later = (seconds: number) => new Date(Date.now() + seconds * 1000);

describe('RequestPasswordResetOtpUseCase', () => {
  let otps: InMemoryOtpRepository;
  let crypto: InMemoryCryptoService;
  let messageSender: InMemoryMessageSender;
  let account: TUserIdentifierSummary | null;
  let useCase: RequestPasswordResetOtpUseCase;

  const storeOtp = (props: Partial<TOtpProps> = {}) => {
    const otp = Otp.restore(`otp-${otps.items.size + 1}`, {
      sender: EOtpSender.EMAIL,
      purpose: EOtpPurpose.RESET_PASSWORD,
      hashedIdentifier: HASH,
      encryptedCode: 'enc(111111)',
      retryCount: 0,
      wrongCount: 0,
      issuedAt: ago(60),
      expiredAt: later(240),
      isConsumed: false,
      blockUntil: null,
      blockReason: null,
      ...props,
    });
    otps.items.set(otp.id, otp);
    return otp;
  };

  const request = () =>
    useCase.execute({
      loginType: EOtpSender.EMAIL,
      identifier: 'Farmer@Mail.com',
    });

  beforeEach(() => {
    otps = new InMemoryOtpRepository();
    crypto = new InMemoryCryptoService();
    crypto.nextDigits = '482913';
    messageSender = new InMemoryMessageSender();
    account = {
      userId: 'user-1',
      identifier: 'farmer@mail.com',
      hashedIdentifier: HASH,
      loginType: 'EMAIL',
      canLogin: true,
    };
    const userQuery: IUserQueryPort = {
      findRoleById: async () => null,
      findProfileById: async () => null,
      findByIdentifier: async () => account,
    };
    useCase = new RequestPasswordResetOtpUseCase(
      otps,
      userQuery,
      crypto,
      messageSender,
      config,
      new InMemoryUnitOfWork(),
    );
  });

  const latestReset = () => otps.findLatest(HASH, EOtpPurpose.RESET_PASSWORD);

  it('issues a RESET_PASSWORD otp and sends the code', async () => {
    await request();

    const otp = await latestReset();
    expect(otp).toMatchObject({
      sender: EOtpSender.EMAIL,
      purpose: EOtpPurpose.RESET_PASSWORD,
      hashedIdentifier: HASH,
      encryptedCode: 'enc(482913)',
      isConsumed: false,
    });
    expect(messageSender.sent).toEqual([
      {
        channel: EMessageChannel.EMAIL,
        to: 'farmer@mail.com',
        subject: expect.any(String),
        body: expect.stringContaining('482913'),
      },
    ]);
  });

  it('refuses while the previous reset code is still valid', async () => {
    storeOtp();

    await expect(request()).rejects.toThrow(OtpAlreadyRequestedException);
    expect(otps.items.size).toBe(1);
    expect(messageSender.sent).toHaveLength(0);
  });

  it('issues a new code once the previous one expired', async () => {
    storeOtp({ issuedAt: ago(600), expiredAt: ago(300) });

    await request();

    expect(otps.items.size).toBe(2);
    expect(messageSender.sent).toHaveLength(1);
  });

  it('issues a new code once the previous one was used', async () => {
    storeOtp({ isConsumed: true });

    await request();

    expect(otps.items.size).toBe(2);
  });

  it('refuses while the previous code is blocked, even expired', async () => {
    storeOtp({
      issuedAt: ago(600),
      expiredAt: ago(300),
      blockUntil: later(600),
      blockReason: EOtpBlockReason.WRONG_COUNT_MAXIMUM,
    });

    await expect(request()).rejects.toThrow(OtpBlockedException);
    expect(messageSender.sent).toHaveLength(0);
  });

  it('ignores a valid otp of another purpose', async () => {
    storeOtp({ purpose: EOtpPurpose.ACTIVATE_DISTRIBUTOR });

    await request();

    expect(messageSender.sent).toHaveLength(1);
  });

  it('rejects an unknown identifier', async () => {
    account = null;

    await expect(request()).rejects.toThrow(OtpAccountNotFoundException);
  });

  it('rejects a login type that does not match the account', async () => {
    account = { ...account!, loginType: 'PHONE' };

    await expect(request()).rejects.toThrow(OtpAccountNotFoundException);
  });

  it('rejects an account that is not active', async () => {
    account = { ...account!, canLogin: false };

    await expect(request()).rejects.toThrow(OtpAccountNotActiveException);
    expect(otps.items.size).toBe(0);
  });
});
