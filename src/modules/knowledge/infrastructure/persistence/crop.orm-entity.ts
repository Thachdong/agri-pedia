import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'crops' })
export class CropOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  code: string;

  @Column({ name: 'name_vi', type: 'varchar', length: 200 })
  nameVi: string;

  @Column({ type: 'boolean' })
  enabled: boolean;
}
