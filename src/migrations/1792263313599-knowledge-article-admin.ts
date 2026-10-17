import { MigrationInterface, QueryRunner } from 'typeorm';

export class KnowledgeArticleAdmin1792263313599 implements MigrationInterface {
  name = 'KnowledgeArticleAdmin1792263313599';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "articles" ADD "origin" character varying(20) NOT NULL DEFAULT 'AI'`,
    );
    await queryRunner.query(`ALTER TABLE "articles" ADD "edited_by" uuid`);
    await queryRunner.query(
      `ALTER TABLE "articles" ADD "is_published" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "articles" DROP COLUMN "is_published"`,
    );
    await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "edited_by"`);
    await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "origin"`);
  }
}
