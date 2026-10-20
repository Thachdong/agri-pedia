import { MigrationInterface, QueryRunner } from 'typeorm';

export class KnowledgeTopArticles1792431990763 implements MigrationInterface {
  name = 'KnowledgeTopArticles1792431990763';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "knowledge_settings" ("id" smallint NOT NULL, "top_articles_limit" integer NOT NULL, CONSTRAINT "PK_b220170fd30ff9e961673753ddf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "knowledge_crop_top_articles" ("crop_type" character varying(50) NOT NULL, "position" integer NOT NULL, "article_id" uuid NOT NULL, CONSTRAINT "PK_94d63c16696f7fc7e7bb1425cdb" PRIMARY KEY ("crop_type", "position"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_crop_top_articles" ADD CONSTRAINT "FK_22be086191acb6912cc5a89220d" FOREIGN KEY ("crop_type") REFERENCES "crops"("code") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_crop_top_articles" ADD CONSTRAINT "FK_be9f870e4cb9b987f8064e81689" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "knowledge_crop_top_articles" DROP CONSTRAINT "FK_be9f870e4cb9b987f8064e81689"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_crop_top_articles" DROP CONSTRAINT "FK_22be086191acb6912cc5a89220d"`,
    );
    await queryRunner.query(`DROP TABLE "knowledge_crop_top_articles"`);
    await queryRunner.query(`DROP TABLE "knowledge_settings"`);
  }
}
