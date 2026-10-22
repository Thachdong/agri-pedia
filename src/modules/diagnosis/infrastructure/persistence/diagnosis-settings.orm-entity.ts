import { Column, Entity, PrimaryColumn } from 'typeorm';

/** The single row of diagnosis settings (id always 1). */
export const DIAGNOSIS_SETTINGS_ROW_ID = 1;

@Entity({ name: 'diagnosis_settings' })
export class DiagnosisSettingsOrmEntity {
  @PrimaryColumn({ type: 'smallint' })
  id: number;

  @Column({ name: 'daily_free_limit', type: 'int' })
  dailyFreeLimit: number;

  @Column({
    name: 'default_crop_type',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  defaultCropType: string | null;

  @Column({ name: 'max_images', type: 'int' })
  maxImages: number;

  @Column({ name: 'max_image_bytes', type: 'int' })
  maxImageBytes: number;

  @Column({ name: 'max_image_width', type: 'int' })
  maxImageWidth: number;

  @Column({ name: 'max_image_height', type: 'int' })
  maxImageHeight: number;

  /** null = env model. */
  @Column({
    name: 'describe_model',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  describeModel: string | null;

  /** null = env model. */
  @Column({
    name: 'verify_model',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  verifyModel: string | null;
}
