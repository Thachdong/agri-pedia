import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crop diagnosis configuration. Existing rows get placeholder values (the KB seed overwrites
 * them on the next start), then the defaults are dropped.
 */
export class KnowledgeCropsConfig1792001604000 implements MigrationInterface {
  name = 'KnowledgeCropsConfig1792001604000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "crops" ADD "name_en" character varying(200) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "crops" ADD "kb_version" character varying(20) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "crops" ADD "sort_order" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "crops" ADD "config" jsonb NOT NULL DEFAULT '{"plantParts":[],"cropStages":[],"features":{},"prompt":{"subjectEn":"","wholeImageCuesEn":""}}'`,
    );
    for (const column of ['name_en', 'kb_version', 'sort_order', 'config']) {
      await queryRunner.query(
        `ALTER TABLE "crops" ALTER COLUMN "${column}" DROP DEFAULT`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "crops" DROP COLUMN "config"`);
    await queryRunner.query(`ALTER TABLE "crops" DROP COLUMN "sort_order"`);
    await queryRunner.query(`ALTER TABLE "crops" DROP COLUMN "kb_version"`);
    await queryRunner.query(`ALTER TABLE "crops" DROP COLUMN "name_en"`);
  }
}
