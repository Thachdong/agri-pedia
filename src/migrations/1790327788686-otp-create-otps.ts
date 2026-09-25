import { MigrationInterface, QueryRunner } from 'typeorm';

export class OtpCreateOtps1790327788686 implements MigrationInterface {
  name = 'OtpCreateOtps1790327788686';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "otps" ("id" uuid NOT NULL, "hash_code" text NOT NULL, "sender" character varying(16) NOT NULL, "purpose" character varying(32) NOT NULL, "hashed_identifier" character varying(128) NOT NULL, "retry_count" integer NOT NULL DEFAULT '0', "wrong_count" integer NOT NULL DEFAULT '0', "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL, "expired_at" TIMESTAMP WITH TIME ZONE NOT NULL, "is_consumed" boolean NOT NULL DEFAULT false, "block_until" TIMESTAMP WITH TIME ZONE, "block_reason" character varying(32), CONSTRAINT "PK_91fef5ed60605b854a2115d2410" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_otps_hashed_identifier_issued_at" ON "otps" ("hashed_identifier", "issued_at") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_otps_hashed_identifier_issued_at"`,
    );
    await queryRunner.query(`DROP TABLE "otps"`);
  }
}
