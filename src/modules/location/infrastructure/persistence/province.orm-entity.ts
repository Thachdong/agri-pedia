import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Master data, seeded by migration. */
@Entity({ name: 'provinces' })
export class ProvinceOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  codename: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** Position in the master data file. */
  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;
}
