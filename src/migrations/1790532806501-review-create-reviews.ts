import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReviewCreateReviews1790532806501 implements MigrationInterface {
  name = 'ReviewCreateReviews1790532806501';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "reviews" ("id" uuid NOT NULL, "user_id" uuid NOT NULL, "target_type" character varying(16) NOT NULL, "target_id" uuid NOT NULL, "content" text NOT NULL, "star" smallint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_reviews_user_target" ON "reviews" ("user_id", "target_type", "target_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_reviews_user_target"`);
    await queryRunner.query(`DROP TABLE "reviews"`);
  }
}
