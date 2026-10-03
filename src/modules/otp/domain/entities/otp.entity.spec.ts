import { EOtpBlockReason } from '../enums/otp-block-reason.enum';
import { EOtpPurpose } from '../enums/otp-purpose.enum';
import { EOtpSender } from '../enums/otp-sender.enum';
import { OtpAlreadyConsumedException } from '../exceptions/otp-already-consumed.exception';
import { OtpAlreadyRequestedException } from '../exceptions/otp-already-requested.exception';
import { OtpBlockedException } from '../exceptions/otp-blocked.exception';
import { OtpExpiredException } from '../exceptions/otp-expired.exception';
import { Otp, TOtpAttemptPolicy, TOtpResendPolicy } from './otp.entity';

const now = new Date('2026-01-01T00:00:00.000Z');

const issue = () =>
  Otp.issue({
    sender: EOtpSender.EMAIL,
    purpose: EOtpPurpose.ACTIVATE_DISTRIBUTOR,
    hashedIdentifier: 'hash',
    encryptedCode: 'enc',
    ttlSeconds: 300,
    now,
  });

describe('Otp.issue', () => {
  it('issues a fresh code expiring after ttl', () => {
    const otp = issue();
    expect(otp.id).toEqual(expect.any(String));
    expect(otp.issuedAt).toEqual(now);
    expect(otp.expiredAt).toEqual(new Date('2026-01-01T00:05:00.000Z'));
    expect(otp.retryCount).toBe(0);
    expect(otp.wrongCount).toBe(0);
    expect(otp.isConsumed).toBe(false);
    expect(otp.blockUntil).toBeNull();
    expect(otp.blockReason).toBeNull();
    expect(otp.encryptedCode).toBe('enc');
    expect(otp.hashedIdentifier).toBe('hash');
  });

  it('restores persisted state as is', () => {
    const otp = Otp.restore('otp-1', {
      sender: EOtpSender.PHONE,
      purpose: EOtpPurpose.RESET_PASSWORD,
      hashedIdentifier: 'hash',
      encryptedCode: 'enc',
      retryCount: 2,
      wrongCount: 3,
      issuedAt: now,
      expiredAt: now,
      isConsumed: true,
      blockUntil: now,
      blockReason: EOtpBlockReason.WRONG_COUNT_MAXIMUM,
    });
    expect(otp.id).toBe('otp-1');
    expect(otp.wrongCount).toBe(3);
    expect(otp.blockReason).toBe(EOtpBlockReason.WRONG_COUNT_MAXIMUM);
  });
});

describe('Otp.verify', () => {
  const policy: TOtpAttemptPolicy = {
    maxWrongCount: 2,
    wrongBlockSeconds: 900,
  };
  const at = (seconds: number) => new Date(now.getTime() + seconds * 1000);

  it('consumes the otp on the right code', () => {
    const otp = issue();
    expect(otp.verify('123456', '123456', at(10), policy)).toBe('VERIFIED');
    expect(otp.isConsumed).toBe(true);
    expect(otp.wrongCount).toBe(0);
  });

  it('counts wrong codes without blocking up to the limit', () => {
    const otp = issue();
    expect(otp.verify('000000', '123456', at(10), policy)).toBe('WRONG_CODE');
    expect(otp.verify('000000', '123456', at(20), policy)).toBe('WRONG_CODE');
    expect(otp.wrongCount).toBe(2);
    expect(otp.blockUntil).toBeNull();
    expect(otp.isConsumed).toBe(false);
  });

  it('blocks once wrongCount exceeds the limit', () => {
    const otp = issue();
    otp.verify('000000', '123456', at(10), policy);
    otp.verify('000000', '123456', at(20), policy);
    expect(otp.verify('000000', '123456', at(30), policy)).toBe('BLOCKED');
    expect(otp.wrongCount).toBe(3);
    expect(otp.blockUntil).toEqual(at(930));
    expect(otp.blockReason).toBe(EOtpBlockReason.WRONG_COUNT_MAXIMUM);
  });

  it('rejects any attempt while blocked, even the right code', () => {
    const otp = issue();
    for (const second of [10, 20, 30]) {
      otp.verify('000000', '123456', at(second), policy);
    }
    expect(() => otp.verify('123456', '123456', at(100), policy)).toThrow(
      OtpBlockedException,
    );
    expect(otp.wrongCount).toBe(3);
  });

  it('accepts attempts again after the block ends (while not expired)', () => {
    const otp = Otp.restore('otp-1', {
      sender: EOtpSender.EMAIL,
      purpose: EOtpPurpose.ACTIVATE_DISTRIBUTOR,
      hashedIdentifier: 'hash',
      encryptedCode: 'enc',
      retryCount: 0,
      wrongCount: 3,
      issuedAt: now,
      expiredAt: at(3600),
      isConsumed: false,
      blockUntil: at(900),
      blockReason: EOtpBlockReason.WRONG_COUNT_MAXIMUM,
    });
    expect(otp.verify('123456', '123456', at(901), policy)).toBe('VERIFIED');
  });

  it('rejects a consumed otp', () => {
    const otp = issue();
    otp.verify('123456', '123456', at(10), policy);
    expect(() => otp.verify('123456', '123456', at(20), policy)).toThrow(
      OtpAlreadyConsumedException,
    );
  });

  it('rejects an expired otp without counting the attempt', () => {
    const otp = issue();
    expect(() => otp.verify('000000', '123456', at(300), policy)).toThrow(
      OtpExpiredException,
    );
    expect(otp.wrongCount).toBe(0);
  });
});

describe('Otp.resend', () => {
  const policy: TOtpResendPolicy = {
    maxRetryCount: 2,
    retryBlockSeconds: 3600,
  };
  const at = (seconds: number) => new Date(now.getTime() + seconds * 1000);
  const restoreWith = (overrides: Partial<Parameters<typeof Otp.restore>[1]>) =>
    Otp.restore('otp-1', {
      sender: EOtpSender.EMAIL,
      purpose: EOtpPurpose.ACTIVATE_DISTRIBUTOR,
      hashedIdentifier: 'hash',
      encryptedCode: 'enc',
      retryCount: 0,
      wrongCount: 0,
      issuedAt: now,
      expiredAt: at(300),
      isConsumed: false,
      blockUntil: null,
      blockReason: null,
      ...overrides,
    });

  it('counts resends up to the limit', () => {
    const otp = issue();
    expect(otp.resend(at(10), policy)).toBe('RESEND');
    expect(otp.resend(at(20), policy)).toBe('RESEND');
    expect(otp.retryCount).toBe(2);
    expect(otp.blockUntil).toBeNull();
  });

  it('blocks once retryCount exceeds the limit', () => {
    const otp = issue();
    otp.resend(at(10), policy);
    otp.resend(at(20), policy);
    expect(otp.resend(at(30), policy)).toBe('BLOCKED');
    expect(otp.retryCount).toBe(3);
    expect(otp.blockUntil).toEqual(at(3630));
    expect(otp.blockReason).toBe(EOtpBlockReason.RETRY_COUNT_MAXIMUM);
  });

  it('rejects a resend while blocked', () => {
    const otp = restoreWith({ retryCount: 3, blockUntil: at(3600) });
    expect(() => otp.resend(at(100), policy)).toThrow(OtpBlockedException);
    expect(otp.retryCount).toBe(3);
  });

  it('rejects a resend while blocked even when expired', () => {
    const otp = restoreWith({ blockUntil: at(3600) });
    expect(() => otp.resend(at(400), policy)).toThrow(OtpBlockedException);
  });

  it('signals EXPIRED without counting once the block is over', () => {
    const otp = restoreWith({ retryCount: 3, blockUntil: at(200) });
    expect(otp.resend(at(301), policy)).toBe('EXPIRED');
    expect(otp.retryCount).toBe(3);
  });

  it('signals EXPIRED for an expired, never blocked otp', () => {
    expect(issue().resend(at(300), policy)).toBe('EXPIRED');
  });

  it('rejects a consumed otp', () => {
    const otp = restoreWith({ isConsumed: true });
    expect(() => otp.resend(at(10), policy)).toThrow(
      OtpAlreadyConsumedException,
    );
  });
});

describe('Otp.assertReplaceable', () => {
  const at = (iso: string) => new Date(iso);
  const restore = (
    overrides: Partial<{
      isConsumed: boolean;
      blockUntil: Date | null;
    }> = {},
  ) =>
    Otp.restore('otp-1', {
      sender: EOtpSender.EMAIL,
      purpose: EOtpPurpose.RESET_PASSWORD,
      hashedIdentifier: 'hash',
      encryptedCode: 'enc',
      retryCount: 0,
      wrongCount: 0,
      issuedAt: now,
      expiredAt: at('2026-01-01T00:05:00.000Z'),
      isConsumed: false,
      blockUntil: null,
      blockReason: null,
      ...overrides,
    });

  it('rejects a still valid otp with its issue and expiry times', () => {
    const otp = restore();
    expect(() => otp.assertReplaceable(at('2026-01-01T00:04:59.000Z'))).toThrow(
      expect.objectContaining({
        constructor: OtpAlreadyRequestedException,
        code: 'OTP_ALREADY_REQUESTED',
        details: {
          purpose: EOtpPurpose.RESET_PASSWORD,
          issuedAt: '2026-01-01T00:00:00.000Z',
          expiredAt: '2026-01-01T00:05:00.000Z',
        },
      }),
    );
  });

  it('allows replacing an expired otp', () => {
    expect(() =>
      restore().assertReplaceable(at('2026-01-01T00:05:00.000Z')),
    ).not.toThrow();
  });

  it('allows replacing a consumed otp, even before expiry', () => {
    expect(() =>
      restore({ isConsumed: true }).assertReplaceable(
        at('2026-01-01T00:01:00.000Z'),
      ),
    ).not.toThrow();
  });

  it('rejects a blocked otp even after expiry', () => {
    const otp = restore({ blockUntil: at('2026-01-01T00:15:00.000Z') });
    expect(() => otp.assertReplaceable(at('2026-01-01T00:10:00.000Z'))).toThrow(
      OtpBlockedException,
    );
  });

  it('allows replacing once the block is over', () => {
    const otp = restore({ blockUntil: at('2026-01-01T00:15:00.000Z') });
    expect(() =>
      otp.assertReplaceable(at('2026-01-01T00:15:00.000Z')),
    ).not.toThrow();
  });
});
