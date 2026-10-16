import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { TDiagnosisRegion, TImageDisease } from '../../domain';

@Entity({ name: 'diagnosis_images' })
@Index('IDX_diagnosis_images_diagnosis_sort', ['diagnosisId', 'sortOrder'], {
  unique: true,
})
export class DiagnosisImageOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'diagnosis_id', type: 'uuid' })
  diagnosisId: string;

  /** Media module id (no FK across modules). */
  @Column({ name: 'media_id', type: 'uuid', nullable: true })
  mediaId: string | null;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;

  @Column({ name: 'plant_part', type: 'varchar', length: 20 })
  plantPart: string;

  @Column({
    name: 'detected_part',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  detectedPart: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  status: string | null;

  @Column({ type: 'jsonb' })
  diseases: TImageDisease[];

  @Column({ type: 'jsonb' })
  regions: TDiagnosisRegion[];

  @Column({ name: 'b1_raw', type: 'jsonb', nullable: true })
  b1Raw: unknown;

  @Column({ name: 'b3_raw', type: 'jsonb', nullable: true })
  b3Raw: unknown;
}
