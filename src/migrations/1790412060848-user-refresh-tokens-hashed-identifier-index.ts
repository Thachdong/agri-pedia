import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserRefreshTokensHashedIdentifierIndex1790412060848 implements MigrationInterface {
  name = 'UserRefreshTokensHashedIdentifierIndex1790412060848';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_hashed_identifier" ON "refresh_tokens" ("hashed_identifier") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_refresh_tokens_hashed_identifier"`,
    );
  }
}
