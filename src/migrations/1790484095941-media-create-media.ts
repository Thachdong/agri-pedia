import { MigrationInterface, QueryRunner } from 'typeorm';

export class MediaCreateMedia1790484095941 implements MigrationInterface {
  name = 'MediaCreateMedia1790484095941';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "media" ("id" uuid NOT NULL, "type" character varying(16) NOT NULL, "extension" character varying(16) NOT NULL, "filename" character varying(255) NOT NULL, "source" character varying(512) NOT NULL, "owner_type" character varying(32) NOT NULL, "owner_id" uuid NOT NULL, "sort_order" integer, CONSTRAINT "PK_f4e0fcac36e050de337b670d8bd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_media_owner" ON "media" ("owner_type", "owner_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_media_owner"`);
    await queryRunner.query(`DROP TABLE "media"`);
  }
}
