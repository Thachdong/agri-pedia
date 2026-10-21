import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductCatalogCategoryUnit1792547150016 implements MigrationInterface {
  name = 'ProductCatalogCategoryUnit1792547150016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_catalog_items" ADD "category_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_catalog_items" ADD "unit" character varying(16)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_catalog_items" DROP COLUMN "unit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_catalog_items" DROP COLUMN "category_id"`,
    );
  }
}
