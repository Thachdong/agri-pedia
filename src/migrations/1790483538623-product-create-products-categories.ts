import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductCreateProductsCategories1790483538623 implements MigrationInterface {
  name = 'ProductCreateProductsCategories1790483538623';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "products" ("id" uuid NOT NULL, "user_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "description" text NOT NULL, "price" numeric(14,2) NOT NULL, "quantity" integer NOT NULL, "unit" character varying(16) NOT NULL, "category_id" uuid NOT NULL, "status" character varying(16) NOT NULL, CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_products_user_id" ON "products" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_products_category_id" ON "products" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" uuid NOT NULL, "name" character varying(255) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE ("name"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_products_category_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_products_user_id"`);
    await queryRunner.query(`DROP TABLE "products"`);
  }
}
