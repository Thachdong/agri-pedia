import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'otps' })
@Index('IDX_otps_hashed_identifier_issued_at', ['hashedIdentifier', 'issuedAt'])
export class OtpOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  /** Encrypted (reversible) code; spec name kept for the column. */
  @Column({ name: 'hash_code', type: 'text' })
  hashCode: string;

  @Column({ type: 'varchar', length: 16 })
  sender: string;

  @Column({ type: 'varchar', length: 32 })
  purpose: string;

  @Column({ name: 'hashed_identifier', type: 'varchar', length: 128 })
  hashedIdentifier: string;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'wrong_count', type: 'int', default: 0 })
  wrongCount: number;

  @Column({ name: 'issued_at', type: 'timestamptz' })
  issuedAt: Date;

  @Column({ name: 'expired_at', type: 'timestamptz' })
  expiredAt: Date;

  @Column({ name: 'is_consumed', type: 'boolean', default: false })
  isConsumed: boolean;

  @Column({ name: 'block_until', type: 'timestamptz', nullable: true })
  blockUntil: Date | null;

  @Column({ name: 'block_reason', type: 'varchar', length: 32, nullable: true })
  blockReason: string | null;
}
