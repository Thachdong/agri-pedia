import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductSuggestionTables1792471333500 implements MigrationInterface {
  name = 'ProductSuggestionTables1792471333500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Trigram similarity for matching names read from photos (kept on revert: other code may use it).
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(
      `CREATE TABLE "product_suggestion_usages" ("user_id" uuid NOT NULL, "used" integer NOT NULL DEFAULT '0', "bonus_used" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_3da2603b1b0dad162c30617fd35" PRIMARY KEY ("user_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_suggestion_settings" ("id" smallint NOT NULL, "invalid_image_limit" integer NOT NULL, "not_found_limit" integer NOT NULL, CONSTRAINT "PK_c2ef51b95d778179af4fa282af6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_suggestion_misses" ("id" uuid NOT NULL, "user_id" uuid NOT NULL, "detected_name" text NOT NULL, "normalized_name" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_0aecc69da2c16a2bac9a9d306dd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_suggestion_misses_normalized_name" ON "product_suggestion_misses" ("normalized_name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "product_catalog_items" ("id" uuid NOT NULL, "name" character varying(255) NOT NULL, "normalized_name" character varying(255) NOT NULL, "description" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_451c3291b9728159de73ec42c62" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_product_catalog_items_normalized_name" ON "product_catalog_items" ("normalized_name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_catalog_items_normalized_name_trgm" ON "product_catalog_items" USING gin ("normalized_name" gin_trgm_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_product_catalog_items_normalized_name_trgm"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_product_catalog_items_normalized_name"`,
    );
    await queryRunner.query(`DROP TABLE "product_catalog_items"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_product_suggestion_misses_normalized_name"`,
    );
    await queryRunner.query(`DROP TABLE "product_suggestion_misses"`);
    await queryRunner.query(`DROP TABLE "product_suggestion_settings"`);
    await queryRunner.query(`DROP TABLE "product_suggestion_usages"`);
  }
}
