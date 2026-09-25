import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserCreateUsersAddresses1790327472861 implements MigrationInterface {
  name = 'UserCreateUsersAddresses1790327472861';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL, "login_type" character varying(16) NOT NULL, "hashed_identifier" character varying(128) NOT NULL, "encrypted_identifier" text NOT NULL, "password_hash" text NOT NULL, "username" character varying(255) NOT NULL, "role" character varying(32) NOT NULL, "business_type" character varying(64), "status" character varying(16) NOT NULL, "identifier_verified_at" TIMESTAMP WITH TIME ZONE, "avatar" uuid, "bio" text, "business_license" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_hashed_identifier" ON "users" ("hashed_identifier") `,
    );
    await queryRunner.query(
      `CREATE TABLE "addresses" ("id" uuid NOT NULL, "user_id" uuid NOT NULL, "province" character varying(255) NOT NULL, "ward" character varying(255) NOT NULL, "house_number" character varying(255) NOT NULL, "lat" double precision NOT NULL, "long" double precision NOT NULL, "is_primary" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_745d8f43d3af10ab8247465e450" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_addresses_user_id" ON "addresses" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_addresses_user_primary" ON "addresses" ("user_id") WHERE "is_primary" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_addresses_user_primary"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_addresses_user_id"`);
    await queryRunner.query(`DROP TABLE "addresses"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_users_hashed_identifier"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
