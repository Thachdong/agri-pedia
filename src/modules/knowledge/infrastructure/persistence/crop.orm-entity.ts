import { Column, Entity, PrimaryColumn } from 'typeorm';
import {
  TCropPlantPart,
  TCropPrompt,
  TCropStageLabel,
  TObservationFeatures,
} from '../../domain';

/** Diagnosis configuration of a crop, from its seed pack. */
export type TCropConfig = {
  plantParts: TCropPlantPart[];
  cropStages: TCropStageLabel[];
  features: TObservationFeatures;
  prompt: TCropPrompt;
};

@Entity({ name: 'crops' })
export class CropOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ name: 'name_vi', type: 'varchar', length: 200 })
  nameVi: string;

  @Column({ name: 'name_en', type: 'varchar', length: 200 })
  nameEn: string;

  @Column({ type: 'boolean' })
  enabled: boolean;

  @Column({ name: 'kb_version', type: 'varchar', length: 20 })
  kbVersion: string;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;

  @Column({ type: 'jsonb' })
  config: TCropConfig;
}
