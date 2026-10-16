import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { TDiseaseContent, TDiseaseProfile } from '../../domain';

@Entity({ name: 'diseases' })
export class DiseaseOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  code: string;

  @Index()
  @Column({ name: 'crop_type', type: 'varchar', length: 50 })
  cropType: string;

  @Column({ type: 'varchar', length: 20 })
  category: string;

  @Column({ name: 'agent_type', type: 'varchar', length: 20 })
  agentType: string;

  @Column({ name: 'name_vi', type: 'varchar', length: 200 })
  nameVi: string;

  @Column({ name: 'name_en', type: 'varchar', length: 200 })
  nameEn: string;

  @Column({
    name: 'scientific_name',
    type: 'varchar',
    length: 300,
    nullable: true,
  })
  scientificName: string | null;

  @Column({ name: 'aliases_vi', type: 'jsonb' })
  aliasesVi: string[];

  @Column({ name: 'aliases_en', type: 'jsonb' })
  aliasesEn: string[];

  @Column({ name: 'affected_parts', type: 'jsonb' })
  affectedParts: string[];

  @Column({ type: 'varchar', length: 20 })
  verification: string;

  /** Scoring weights (`profile.json`), null = never a candidate. */
  @Column({ type: 'jsonb', nullable: true })
  profile: TDiseaseProfile | null;

  /** Rest of the KB entry (symptoms, variants, treatments, ...), vn + en. */
  @Column({ type: 'jsonb' })
  data: TDiseaseContent;

  @Column({ name: 'kb_version', type: 'varchar', length: 20 })
  kbVersion: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
