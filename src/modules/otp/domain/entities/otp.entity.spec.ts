import { EOtpBlockReason } from '../enums/otp-block-reason.enum';
import { EOtpPurpose } from '../enums/otp-purpose.enum';
import { EOtpSender } from '../enums/otp-sender.enum';
import { OtpAlreadyConsumedException } from '../exceptions/otp-already-consumed.exception';
import { OtpBlockedException } from '../exceptions/otp-blocked.exception';
import { OtpExpiredException } from '../exceptions/otp-expired.exception';
import { Otp, TOtpAttemptPolicy } from './otp.entity';

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
