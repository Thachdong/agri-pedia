import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReviewAddReviewsTargetCreatedIndex1790536530610 implements MigrationInterface {
  name = 'ReviewAddReviewsTargetCreatedIndex1790536530610';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_reviews_target_created_id" ON "reviews" ("target_id", "created_at", "id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_reviews_target_created_id"`,
    );
  }
}
