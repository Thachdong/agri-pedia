import { MigrationInterface, QueryRunner } from 'typeorm';

export class KnowledgeCreateCropsDiseases1791877941231 implements MigrationInterface {
  name = 'KnowledgeCreateCropsDiseases1791877941231';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "crops" ("code" character varying(50) NOT NULL, "name_vi" character varying(200) NOT NULL, "enabled" boolean NOT NULL, CONSTRAINT "PK_a72182c1b2156bd94d6b10f1eb4" PRIMARY KEY ("code"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "diseases" ("code" character varying(100) NOT NULL, "crop_type" character varying(50) NOT NULL, "category" character varying(20) NOT NULL, "agent_type" character varying(20) NOT NULL, "name_vi" character varying(200) NOT NULL, "name_en" character varying(200) NOT NULL, "scientific_name" character varying(300), "aliases_vi" jsonb NOT NULL, "aliases_en" jsonb NOT NULL, "affected_parts" jsonb NOT NULL, "verification" character varying(20) NOT NULL, "profile" jsonb, "data" jsonb NOT NULL, "kb_version" character varying(20) NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e0c5faa8b8f4ff13c13defa60d5" PRIMARY KEY ("code"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aa49359fd4784b3fd5459158ee" ON "diseases" ("crop_type") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_aa49359fd4784b3fd5459158ee"`,
    );
    await queryRunner.query(`DROP TABLE "diseases"`);
    await queryRunner.query(`DROP TABLE "crops"`);
  }
}
