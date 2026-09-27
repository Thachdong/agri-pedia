import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rows backfilled by ProductAddProductsCreatedAt got now() with microseconds; the app writes
 * millisecond precision (JS Date), and pagination cursors carry milliseconds. Truncate so
 * cursor comparison never skips those rows. Data-only; not reversible (precision is lost).
 */
export class ProductTruncateProductsCreatedAt1790526052243 implements MigrationInterface {
  name = 'ProductTruncateProductsCreatedAt1790526052243';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "products" SET "created_at" = date_trunc('milliseconds', "created_at") WHERE "created_at" <> date_trunc('milliseconds', "created_at")`,
    );
  }

  public async down(): Promise<void> {
    // Nothing to undo: truncated microseconds cannot be restored and are not needed.
  }
}
