import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductAddProductsCreatedAt1790525474813 implements MigrationInterface {
  name = 'ProductAddProductsCreatedAt1790525474813';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Existing rows get the migration time; the app always sets created_at, so the default is dropped.
    await queryRunner.query(
      `ALTER TABLE "products" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "created_at" DROP DEFAULT`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_products_user_created_id" ON "products" ("user_id", "created_at", "id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_products_user_created_id"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "created_at"`);
  }
}
