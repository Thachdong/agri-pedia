import { MigrationInterface, QueryRunner } from 'typeorm';

export class KnowledgeArticleVariants1792169496917 implements MigrationInterface {
  name = 'KnowledgeArticleVariants1792169496917';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "articles" ADD "variant_code" character varying(100)`,
    );
    // The disease's main article stays unique; variant articles are unique by variant code.
    await queryRunner.query(
      `DROP INDEX "public"."UQ_articles_disease_code_locale"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_articles_disease_code_locale" ON "articles" ("disease_code", "locale") WHERE "variant_code" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_articles_variant_code_locale" ON "articles" ("variant_code", "locale") WHERE "variant_code" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_articles_variant_code_locale"`,
    );
    await queryRunner.query(
      `DELETE FROM "articles" WHERE "variant_code" IS NOT NULL`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_articles_disease_code_locale"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_articles_disease_code_locale" ON "articles" ("disease_code", "locale") `,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" DROP COLUMN "variant_code"`,
    );
  }
}
