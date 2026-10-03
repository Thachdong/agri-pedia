import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserCreateRefreshTokens1790404208983 implements MigrationInterface {
  name = 'UserCreateRefreshTokens1790404208983';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL, "family_id" uuid NOT NULL, "hashed_token" character varying(128) NOT NULL, "hashed_identifier" character varying(128) NOT NULL, "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL, "expired_at" TIMESTAMP WITH TIME ZONE NOT NULL, "status" character varying(16) NOT NULL, "rotated_from_id" uuid, CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_refresh_tokens_hashed_token" ON "refresh_tokens" ("hashed_token") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_refresh_tokens_hashed_token"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}
