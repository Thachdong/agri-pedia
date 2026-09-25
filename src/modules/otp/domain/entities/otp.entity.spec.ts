import { EOtpBlockReason } from '../enums/otp-block-reason.enum';
import { EOtpPurpose } from '../enums/otp-purpose.enum';
import { EOtpSender } from '../enums/otp-sender.enum';
import { Otp } from './otp.entity';

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
