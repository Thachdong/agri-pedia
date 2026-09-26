import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'users' })
export class UserOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'login_type', type: 'varchar', length: 16 })
  loginType: string;

  @Index('UQ_users_hashed_identifier', { unique: true })
  @Column({ name: 'hashed_identifier', type: 'varchar', length: 128 })
  hashedIdentifier: string;

  @Column({ name: 'encrypted_identifier', type: 'text' })
  encryptedIdentifier: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 255 })
  username: string;

  @Column({ type: 'varchar', length: 32 })
  role: string;

  @Column({
    name: 'business_type',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  businessType: string | null;

  @Column({ type: 'varchar', length: 16 })
  status: string;

  @Column({
    name: 'identifier_verified_at',
    type: 'timestamptz',
    nullable: true,
  })
  identifierVerifiedAt: Date | null;

  /** Media id (media module); plain column, no FK. */
  @Column({ type: 'uuid', nullable: true })
  avatar: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  /** Media id (media module); plain column, no FK. */
  @Column({ name: 'business_license', type: 'uuid', nullable: true })
  businessLicense: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
