import { MigrationInterface, QueryRunner } from 'typeorm';

export class DiagnosisSettings1792431990762 implements MigrationInterface {
  name = 'DiagnosisSettings1792431990762';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "diagnosis_settings" ("id" smallint NOT NULL, "daily_free_limit" integer NOT NULL, "default_crop_type" character varying(50), "max_images" integer NOT NULL, "max_image_bytes" integer NOT NULL, "max_image_width" integer NOT NULL, "max_image_height" integer NOT NULL, CONSTRAINT "PK_027fe7a2cb71fee3e7b8f18ef36" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "diagnosis_settings"`);
  }
}
