import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductAddProductsDeletedAt1790523245129 implements MigrationInterface {
  name = 'ProductAddProductsDeletedAt1790523245129';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "deleted_at"`);
  }
}
