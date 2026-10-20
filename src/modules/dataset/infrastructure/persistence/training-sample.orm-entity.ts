import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { TSampleRegion } from '../../domain';

@Entity({ name: 'training_samples' })
@Index('UQ_training_samples_diagnosis_sort', ['diagnosisId', 'sortOrder'], {
  unique: true,
})
export class TrainingSampleOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'diagnosis_id', type: 'uuid' })
  diagnosisId: string;

  @Column({ name: 'sort_order', type: 'smallint' })
  sortOrder: number;

  @Column({ name: 'crop_type', type: 'varchar', length: 50 })
  cropType: string;

  @Column({ name: 'plant_part', type: 'varchar', length: 50 })
  plantPart: string;

  @Column({ name: 'disease_code', type: 'varchar', length: 100 })
  diseaseCode: string;

  @Column({
    name: 'variant_code',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  variantCode: string | null;

  @Column({ name: 'confidence_score', type: 'real' })
  confidenceScore: number;

  @Column({ type: 'jsonb' })
  regions: TSampleRegion[];

  @Column({ name: 'image_key', type: 'varchar', length: 255 })
  imageKey: string;

  @Column({ name: 'label_source', type: 'varchar', length: 20 })
  labelSource: string;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar', length: 200 })
  model: string;

  @Column({ name: 'prompt_version', type: 'varchar', length: 50 })
  promptVersion: string;

  @Column({ name: 'kb_version', type: 'varchar', length: 20 })
  kbVersion: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
