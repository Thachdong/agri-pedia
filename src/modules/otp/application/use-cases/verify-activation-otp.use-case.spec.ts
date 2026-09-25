import { IConfigService } from '@shared/config';
import { InMemoryCryptoService } from '@shared/crypto';
import { InMemoryUnitOfWork } from '@shared/database';
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
import { InMemoryOtpRepository } from '../ports/fakes';
import { VerifyActivationOtpUseCase } from './verify-activation-otp.use-case';

const HASH = 'hash(0912345678)';

const config = {
  get: () => ({ maxWrongCount: 2, wrongBlockSeconds: 900 }),
} as unknown as IConfigService;

const issue = (overrides: { ttlSeconds?: number; now?: Date } = {}) =>
  Otp.issue({
    sender: EOtpSender.PHONE,
    purpose: EOtpPurpose.ACTIVATE_DISTRIBUTOR,
    hashedIdentifier: HASH,
    encryptedCode: 'enc(482913)',
    ttlSeconds: overrides.ttlSeconds ?? 300,
    now: overrides.now,
  });

describe('VerifyActivationOtpUseCase', () => {
  let otps: InMemoryOtpRepository;
  let userQuery: IUserQueryPort;
  let useCase: VerifyActivationOtpUseCase;

  beforeEach(() => {
    otps = new InMemoryOtpRepository();
    userQuery = {
      findByIdentifier: async (identifier) =>
        identifier === '0912 345 678'
          ? { userId: 'user-1', hashedIdentifier: HASH }
          : null,
    };
    useCase = new VerifyActivationOtpUseCase(
      otps,
      userQuery,
      new InMemoryCryptoService(),
      config,
      new InMemoryUnitOfWork(),
    );
  });

  const verify = (code: string) =>
    useCase.execute({ identifier: '0912 345 678', code });

  it('consumes the latest activation otp on the right code', async () => {
    const old = issue({ now: new Date(Date.now() - 60_000) });
    const latest = issue();
    await otps.save(old);
    await otps.save(latest);

    await verify('482913');

    expect(latest.isConsumed).toBe(true);
    expect(old.isConsumed).toBe(false);
  });

  it('ignores otps of another purpose', async () => {
    await otps.save(
      Otp.issue({
        sender: EOtpSender.PHONE,
        purpose: EOtpPurpose.RESET_PASSWORD,
        hashedIdentifier: HASH,
        encryptedCode: 'enc(482913)',
        ttlSeconds: 300,
      }),
    );
    await expect(verify('482913')).rejects.toThrow(OtpNotFoundException);
  });

  it('throws OtpNotFound for an unknown identifier', async () => {
    await expect(
      useCase.execute({ identifier: 'nobody@mail.com', code: '482913' }),
    ).rejects.toThrow(OtpNotFoundException);
  });

  it('throws OtpNotFound when no otp was issued', async () => {
    await expect(verify('482913')).rejects.toThrow(OtpNotFoundException);
  });

  it('counts a wrong code and throws OtpInvalidCode', async () => {
    const otp = issue();
    await otps.save(otp);

    await expect(verify('000000')).rejects.toThrow(OtpInvalidCodeException);
    expect(otp.wrongCount).toBe(1);
    expect(otp.isConsumed).toBe(false);
  });

  it('blocks once the wrong limit is exceeded and throws OtpBlocked', async () => {
    const otp = issue();
    await otps.save(otp);
    await expect(verify('000000')).rejects.toThrow(OtpInvalidCodeException);
    await expect(verify('000000')).rejects.toThrow(OtpInvalidCodeException);

    await expect(verify('000000')).rejects.toThrow(OtpBlockedException);
    expect(otp.blockReason).toBe(EOtpBlockReason.WRONG_COUNT_MAXIMUM);
    await expect(verify('482913')).rejects.toThrow(OtpBlockedException);
  });

  it('rejects a consumed otp', async () => {
    await otps.save(issue());
    await verify('482913');
    await expect(verify('482913')).rejects.toThrow(OtpAlreadyConsumedException);
  });

  it('rejects an expired otp', async () => {
    await otps.save(issue({ now: new Date(Date.now() - 301_000) }));
    await expect(verify('482913')).rejects.toThrow(OtpExpiredException);
  });
});
