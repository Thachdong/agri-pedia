import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'refresh_tokens' })
export class RefreshTokenOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'family_id', type: 'uuid' })
  familyId: string;

  @Index('UQ_refresh_tokens_hashed_token', { unique: true })
  @Column({ name: 'hashed_token', type: 'varchar', length: 128 })
  hashedToken: string;

  @Column({ name: 'hashed_identifier', type: 'varchar', length: 128 })
  hashedIdentifier: string;

  @Column({ name: 'issued_at', type: 'timestamptz' })
  issuedAt: Date;

  @Column({ name: 'expired_at', type: 'timestamptz' })
  expiredAt: Date;

  @Column({ type: 'varchar', length: 16 })
  status: string;

  @Column({ name: 'rotated_from_id', type: 'uuid', nullable: true })
  rotatedFromId: string | null;
}
