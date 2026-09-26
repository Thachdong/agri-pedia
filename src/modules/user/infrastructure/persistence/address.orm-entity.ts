import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'addresses' })
@Index('UQ_addresses_user_primary', ['userId'], {
  unique: true,
  where: '"is_primary" = true',
})
export class AddressOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Index('IDX_addresses_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  province: string;

  @Column({ type: 'varchar', length: 255 })
  ward: string;

  @Column({ name: 'house_number', type: 'varchar', length: 255 })
  houseNumber: string;

  @Column({ type: 'double precision' })
  lat: number;

  @Column({ type: 'double precision' })
  long: number;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;
}
