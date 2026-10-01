import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'addresses' })
@Index('IDX_addresses_province_ward', ['province', 'ward'])
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

  /** Derived from lat/long by Postgres (PostGIS); read-only, used by distance searches only. */
  @Index('IDX_addresses_location', { spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    generatedType: 'STORED',
    asExpression: 'ST_SetSRID(ST_MakePoint("long", "lat"), 4326)::geography',
    insert: false,
    update: false,
    select: false,
    nullable: true,
  })
  location?: string;
}
