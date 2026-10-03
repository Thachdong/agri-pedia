import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserRefreshTokensIndexes1790406397463 implements MigrationInterface {
  name = 'UserRefreshTokensIndexes1790406397463';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_family_id" ON "refresh_tokens" ("family_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_rotated_from_id" ON "refresh_tokens" ("rotated_from_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_refresh_tokens_rotated_from_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_refresh_tokens_family_id"`,
    );
  }
}
