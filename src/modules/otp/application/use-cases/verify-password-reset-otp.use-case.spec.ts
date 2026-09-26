import { IConfigService } from '@shared/config';
import { InMemoryCryptoService } from '@shared/crypto';
import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryEventBus } from '@shared/event-bus';
import { IUserQueryPort } from '@modules/user/contracts';
import {
  EOtpBlockReason,
  EOtpPurpose,
  EOtpSender,
  Otp,
  OtpAlreadyConsumedException,
  OtpBlockedException,
  OtpExpiredException,
  OtpInvalidCodeException,
  OtpNotFoundException,
} from '../../domain';
import { OTP_PASSWORD_RESET_CODE_VERIFIED_EVENT } from '../../contracts';
import { InMemoryOtpRepository } from '../ports/fakes';
import { VerifyPasswordResetOtpUseCase } from './verify-password-reset-otp.use-case';

const HASH = 'hash(farmer@mail.com)';

const config = {
  get: () => ({ maxWrongCount: 2, wrongBlockSeconds: 900 }),
} as unknown as IConfigService;

const issue = (
  overrides: { purpose?: EOtpPurpose; ttlSeconds?: number; now?: Date } = {},
) =>
  Otp.issue({
    sender: EOtpSender.EMAIL,
    purpose: overrides.purpose ?? EOtpPurpose.RESET_PASSWORD,
    hashedIdentifier: HASH,
    encryptedCode: 'enc(482913)',
    ttlSeconds: overrides.ttlSeconds ?? 300,
    now: overrides.now,
  });

describe('VerifyPasswordResetOtpUseCase', () => {
  let otps: InMemoryOtpRepository;
  let eventBus: InMemoryEventBus;
  let useCase: VerifyPasswordResetOtpUseCase;

  beforeEach(() => {
    otps = new InMemoryOtpRepository();
    eventBus = new InMemoryEventBus();
    const userQuery: IUserQueryPort = {
      findByIdentifier: async (identifier) =>
        identifier === 'Farmer@Mail.com'
          ? {
              userId: 'user-1',
              identifier: 'farmer@mail.com',
              hashedIdentifier: HASH,
              loginType: 'EMAIL',
              canLogin: true,
            }
          : null,
    };
    useCase = new VerifyPasswordResetOtpUseCase(
      otps,
      userQuery,
      new InMemoryCryptoService(),
      config,
      new InMemoryUnitOfWork(),
      eventBus,
    );
  });

  const verify = (code: string) =>
    useCase.execute({
      identifier: 'Farmer@Mail.com',
      code,
      newPassword: 'new-secret-123',
    });

  it('consumes the latest reset otp on the right code', async () => {
    const old = issue({ now: new Date(Date.now() - 60_000) });
    const latest = issue();
    await otps.save(old);
    await otps.save(latest);

    await verify('482913');

    expect(latest.isConsumed).toBe(true);
    expect(old.isConsumed).toBe(false);
    expect(eventBus.published).toEqual([
      {
        name: OTP_PASSWORD_RESET_CODE_VERIFIED_EVENT,
        occurredAt: expect.any(String),
        payload: { userId: 'user-1', passwordHash: 'pwd(new-secret-123)' },
      },
    ]);
  });

  it('ignores otps of another purpose', async () => {
    await otps.save(issue({ purpose: EOtpPurpose.ACTIVATE_DISTRIBUTOR }));

    await expect(verify('482913')).rejects.toThrow(OtpNotFoundException);
  });

  it('throws OtpNotFound for an unknown identifier', async () => {
    await otps.save(issue());

    await expect(
      useCase.execute({
        identifier: 'nobody@mail.com',
        code: '482913',
        newPassword: 'new-secret-123',
      }),
    ).rejects.toThrow(OtpNotFoundException);
  });

  it('throws OtpNotFound when no reset was requested', async () => {
    await expect(verify('482913')).rejects.toThrow(OtpNotFoundException);
  });

  it('counts a wrong code and throws OtpInvalidCode', async () => {
    const otp = issue();
    await otps.save(otp);

    await expect(verify('000000')).rejects.toThrow(OtpInvalidCodeException);
    expect(otp.wrongCount).toBe(1);
    expect(otp.isConsumed).toBe(false);
    expect(eventBus.published).toEqual([]);
  });

  it('blocks once the wrong limit is exceeded', async () => {
    const otp = issue();
    await otps.save(otp);
    await expect(verify('000000')).rejects.toThrow(OtpInvalidCodeException);
    await expect(verify('000000')).rejects.toThrow(OtpInvalidCodeException);

    await expect(verify('000000')).rejects.toThrow(OtpBlockedException);
    expect(otp.blockReason).toBe(EOtpBlockReason.WRONG_COUNT_MAXIMUM);
    await expect(verify('482913')).rejects.toThrow(OtpBlockedException);
    expect(eventBus.published).toEqual([]);
  });

  it('rejects a consumed otp', async () => {
    await otps.save(issue());
    await verify('482913');

    await expect(verify('482913')).rejects.toThrow(OtpAlreadyConsumedException);
    expect(eventBus.published).toHaveLength(1);
  });

  it('rejects an expired otp', async () => {
    await otps.save(issue({ now: new Date(Date.now() - 301_000) }));

    await expect(verify('482913')).rejects.toThrow(OtpExpiredException);
    expect(eventBus.published).toEqual([]);
  });
});
