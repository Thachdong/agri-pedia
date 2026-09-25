import { EOtpBlockReason, EOtpPurpose, EOtpSender, Otp } from '../../domain';
import { OtpOrmEntity } from './otp.orm-entity';

export class OtpMapper {
  static toDomain(row: OtpOrmEntity): Otp {
    return Otp.restore(row.id, {
      sender: row.sender as EOtpSender,
      purpose: row.purpose as EOtpPurpose,
      hashedIdentifier: row.hashedIdentifier,
      encryptedCode: row.hashCode,
      retryCount: row.retryCount,
      wrongCount: row.wrongCount,
      issuedAt: row.issuedAt,
      expiredAt: row.expiredAt,
      isConsumed: row.isConsumed,
      blockUntil: row.blockUntil,
      blockReason: row.blockReason as EOtpBlockReason | null,
    });
  }

  static toOrm(otp: Otp): OtpOrmEntity {
    return Object.assign(new OtpOrmEntity(), {
      id: otp.id,
      hashCode: otp.encryptedCode,
      sender: otp.sender,
      purpose: otp.purpose,
      hashedIdentifier: otp.hashedIdentifier,
      retryCount: otp.retryCount,
      wrongCount: otp.wrongCount,
      issuedAt: otp.issuedAt,
      expiredAt: otp.expiredAt,
      isConsumed: otp.isConsumed,
      blockUntil: otp.blockUntil,
      blockReason: otp.blockReason,
    });
  }
}
