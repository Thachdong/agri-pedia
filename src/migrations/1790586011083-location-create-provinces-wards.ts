import { MigrationInterface, QueryRunner } from 'typeorm';

export class LocationCreateProvincesWards1790586011083 implements MigrationInterface {
  name = 'LocationCreateProvincesWards1790586011083';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "provinces" ("codename" character varying(64) NOT NULL, "name" character varying(100) NOT NULL, "sort_order" integer NOT NULL, CONSTRAINT "PK_7ef6517a1ab2d6c43037c59e4b5" PRIMARY KEY ("codename"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "wards" ("province_codename" character varying(64) NOT NULL, "codename" character varying(64) NOT NULL, "name" character varying(100) NOT NULL, "sort_order" integer NOT NULL, CONSTRAINT "PK_17e72d9dbe35376a97a6ab7f6d4" PRIMARY KEY ("province_codename", "codename"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "wards" ADD CONSTRAINT "FK_a1072690193965ba4af0708e0f4" FOREIGN KEY ("province_codename") REFERENCES "provinces"("codename") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wards" DROP CONSTRAINT "FK_a1072690193965ba4af0708e0f4"`,
    );
    await queryRunner.query(`DROP TABLE "wards"`);
    await queryRunner.query(`DROP TABLE "provinces"`);
  }
}
