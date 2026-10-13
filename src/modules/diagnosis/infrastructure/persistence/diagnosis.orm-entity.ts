import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { TDiagnosisSummary } from '../../domain';

@Entity({ name: 'diagnoses' })
@Index('IDX_diagnoses_user_created_id', ['userId', 'createdAt', 'id'])
@Index('IDX_diagnoses_status_created', ['status', 'createdAt'])
export class DiagnosisOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'crop_type', type: 'varchar', length: 50 })
  cropType: string;

  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  note: string | null;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar', length: 200 })
  model: string;

  @Column({ name: 'prompt_version', type: 'varchar', length: 50 })
  promptVersion: string;

  @Column({ name: 'kb_version', type: 'varchar', length: 20 })
  kbVersion: string;

  @Column({ type: 'jsonb', nullable: true })
  summary: TDiagnosisSummary | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @Column({
    name: 'user_feedback',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  userFeedback: string | null;

  @Column({
    name: 'feedback_comment',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  feedbackComment: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
