import { MigrationInterface, QueryRunner } from 'typeorm';

export class DiagnosisSettingsAiModels1792567848628 implements MigrationInterface {
  name = 'DiagnosisSettingsAiModels1792567848628';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "diagnosis_settings" ADD "describe_model" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "diagnosis_settings" ADD "verify_model" character varying(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "diagnosis_settings" DROP COLUMN "verify_model"`,
    );
    await queryRunner.query(
      `ALTER TABLE "diagnosis_settings" DROP COLUMN "describe_model"`,
    );
  }
}
