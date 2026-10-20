import { MigrationInterface, QueryRunner } from 'typeorm';

export class KnowledgeArticles1792126141964 implements MigrationInterface {
  name = 'KnowledgeArticles1792126141964';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "articles" ("id" uuid NOT NULL, "crop_type" character varying(50) NOT NULL, "disease_code" character varying(100), "slug" character varying(100) NOT NULL, "locale" character varying(10) NOT NULL DEFAULT 'vi', "title" character varying(200) COLLATE "vi-x-icu" NOT NULL, "summary" character varying(300) NOT NULL, "markdown" text NOT NULL, "cover" character varying(200), "images" jsonb NOT NULL, "sources" jsonb NOT NULL, "status" character varying(20) NOT NULL, "reviewed_by" character varying(100), "reviewed_at" TIMESTAMP WITH TIME ZONE, "kb_version" character varying(20) NOT NULL, "content_hash" character varying(64) NOT NULL, "published_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_0a6e2c450d83e0b6052c2793334" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_articles_crop_type_status" ON "articles" ("crop_type", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_articles_crop_type_title" ON "articles" ("crop_type", "title") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_articles_disease_code_locale" ON "articles" ("disease_code", "locale") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_articles_crop_type_slug" ON "articles" ("crop_type", "slug") `,
    );
    // Existing crops get their slug here; the next seed rewrites it from crop.json.
    await queryRunner.query(
      `ALTER TABLE "crops" ADD "slug" character varying(100)`,
    );
    await queryRunner.query(
      `UPDATE "crops" SET "slug" = CASE "code" WHEN 'RICE' THEN 'lua' WHEN 'DURIAN' THEN 'sau-rieng' ELSE lower(replace("code", '_', '-')) END`,
    );
    await queryRunner.query(
      `ALTER TABLE "crops" ALTER COLUMN "slug" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "crops" ADD CONSTRAINT "UQ_944136fc2f96bbc5b2ff8197ed6" UNIQUE ("slug")`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ADD CONSTRAINT "FK_d5c2f4a2a4c713cbba18be90068" FOREIGN KEY ("crop_type") REFERENCES "crops"("code") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ADD CONSTRAINT "FK_5e4fda0d1eb6c0b5c280e6d7794" FOREIGN KEY ("disease_code") REFERENCES "diseases"("code") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "articles" DROP CONSTRAINT "FK_5e4fda0d1eb6c0b5c280e6d7794"`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" DROP CONSTRAINT "FK_d5c2f4a2a4c713cbba18be90068"`,
    );
    await queryRunner.query(
      `ALTER TABLE "crops" DROP CONSTRAINT "UQ_944136fc2f96bbc5b2ff8197ed6"`,
    );
    await queryRunner.query(`ALTER TABLE "crops" DROP COLUMN "slug"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_articles_crop_type_slug"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_articles_disease_code_locale"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_articles_crop_type_title"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_articles_crop_type_status"`,
    );
    await queryRunner.query(`DROP TABLE "articles"`);
  }
}
