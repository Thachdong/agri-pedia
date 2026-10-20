import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Article images moved to the public bucket (keys without the `public/` prefix). Seeded rows
 * are dropped so the next start seeds them again and uploads the images there.
 */
export class KnowledgeArticlesPublicBucket1792146075498 implements MigrationInterface {
  name = 'KnowledgeArticlesPublicBucket1792146075498';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "articles"`);
  }

  public async down(): Promise<void> {
    // Rows come back with the next seed.
  }
}
