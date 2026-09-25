import { EOtpBlockReason, EOtpPurpose, EOtpSender, Otp } from '../../domain';
import { OtpMapper } from './otp.mapper';

describe('OtpMapper', () => {
  it('round-trips a fresh otp', () => {
    const otp = Otp.issue({
      sender: EOtpSender.EMAIL,
      purpose: EOtpPurpose.ACTIVATE_DISTRIBUTOR,
      hashedIdentifier: 'hash',
      encryptedCode: 'enc',
      ttlSeconds: 300,
    });
    const restored = OtpMapper.toDomain(OtpMapper.toOrm(otp));
    expect(OtpMapper.toOrm(restored)).toEqual(OtpMapper.toOrm(otp));
    expect(restored.encryptedCode).toBe('enc');
  });

  it('round-trips a blocked otp', () => {
    const now = new Date();
    const otp = Otp.restore('9a0e6c1e-0000-4000-8000-000000000001', {
      sender: EOtpSender.PHONE,
      purpose: EOtpPurpose.RESET_PASSWORD,
      hashedIdentifier: 'hash',
      encryptedCode: 'enc',
      retryCount: 3,
      wrongCount: 5,
      issuedAt: now,
      expiredAt: now,
      isConsumed: true,
      blockUntil: now,
      blockReason: EOtpBlockReason.RETRY_COUNT_MAXIMUM,
    });
    const restored = OtpMapper.toDomain(OtpMapper.toOrm(otp));
    expect(OtpMapper.toOrm(restored)).toEqual(OtpMapper.toOrm(otp));
  });
});
