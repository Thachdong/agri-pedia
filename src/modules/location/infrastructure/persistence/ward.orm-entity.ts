import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ProvinceOrmEntity } from './province.orm-entity';

/** Master data, seeded by migration. Codename is unique within its province only. */
@Entity({ name: 'wards' })
export class WardOrmEntity {
  @PrimaryColumn({ name: 'province_codename', type: 'varchar', length: 64 })
  provinceCodename: string;

  @PrimaryColumn({ type: 'varchar', length: 64 })
  codename: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** Position in the master data file. */
  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;

  /** Same module, so a real FK. */
  @ManyToOne(() => ProvinceOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'province_codename' })
  province?: ProvinceOrmEntity;
}
