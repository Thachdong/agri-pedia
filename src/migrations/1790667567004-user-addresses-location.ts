import { MigrationInterface, QueryRunner } from 'typeorm';

const LOCATION_EXPRESSION =
  'ST_SetSRID(ST_MakePoint("long", "lat"), 4326)::geography';

export class UserAddressesLocation1790667567004 implements MigrationInterface {
  name = 'UserAddressesLocation1790667567004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Hand-edited: enable PostGIS first; typeorm_metadata row uses the current database/schema
    // instead of the generator's hard-coded names.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    await queryRunner.query(
      `ALTER TABLE "addresses" ADD "location" geography(Point,4326) GENERATED ALWAYS AS (${LOCATION_EXPRESSION}) STORED`,
    );
    await queryRunner.query(
      `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (current_database(), current_schema(), $1, $2, $3, $4)`,
      ['addresses', 'GENERATED_COLUMN', 'location', LOCATION_EXPRESSION],
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_addresses_location" ON "addresses" USING GiST ("location") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_addresses_province_ward" ON "addresses" ("province", "ward") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The postgis extension is left installed: dropping it is a database-level decision.
    await queryRunner.query(
      `DROP INDEX "public"."IDX_addresses_province_ward"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_addresses_location"`);
    await queryRunner.query(
      `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = current_database() AND "schema" = current_schema() AND "table" = $3`,
      ['GENERATED_COLUMN', 'location', 'addresses'],
    );
    await queryRunner.query(`ALTER TABLE "addresses" DROP COLUMN "location"`);
  }
}
