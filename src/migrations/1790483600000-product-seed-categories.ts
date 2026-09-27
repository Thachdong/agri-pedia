import { MigrationInterface, QueryRunner } from 'typeorm';

const CATEGORY_NAMES = [
  'Thuốc & vật tư nông nghiệp',
  'Giống cây trồng',
  'Giống thủy sản',
];

/** Initial categories (one per distributor business type); no category API yet. */
export class ProductSeedCategories1790483600000 implements MigrationInterface {
  name = 'ProductSeedCategories1790483600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "categories" ("id", "name") SELECT gen_random_uuid(), unnest($1::varchar[]) ON CONFLICT ("name") DO NOTHING`,
      [CATEGORY_NAMES],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "categories" WHERE "name" = ANY($1::varchar[])`,
      [CATEGORY_NAMES],
    );
  }
}
