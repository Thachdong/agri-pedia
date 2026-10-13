import { MigrationInterface, QueryRunner } from 'typeorm';

export class DiagnosisCreateDiagnoses1791880844042 implements MigrationInterface {
  name = 'DiagnosisCreateDiagnoses1791880844042';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "diagnoses" ("id" uuid NOT NULL, "user_id" uuid NOT NULL, "crop_type" character varying(50) NOT NULL, "status" character varying(20) NOT NULL, "note" character varying(1000), "provider" character varying(50) NOT NULL, "model" character varying(200) NOT NULL, "prompt_version" character varying(50) NOT NULL, "kb_version" character varying(20) NOT NULL, "summary" jsonb, "failure_reason" text, "user_feedback" character varying(20), "feedback_comment" character varying(1000), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "completed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_d1bfabf423f99c537817e6ad244" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_diagnoses_status_created" ON "diagnoses" ("status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_diagnoses_user_created_id" ON "diagnoses" ("user_id", "created_at", "id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "diagnosis_images" ("id" uuid NOT NULL, "diagnosis_id" uuid NOT NULL, "media_id" uuid, "sort_order" integer NOT NULL, "plant_part" character varying(20) NOT NULL, "detected_part" character varying(20), "status" character varying(20), "diseases" jsonb NOT NULL, "regions" jsonb NOT NULL, "b1_raw" jsonb, "b3_raw" jsonb, CONSTRAINT "PK_c09d74f826d6a1aa1379203fc4d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_diagnosis_images_diagnosis_sort" ON "diagnosis_images" ("diagnosis_id", "sort_order") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_diagnosis_images_diagnosis_sort"`,
    );
    await queryRunner.query(`DROP TABLE "diagnosis_images"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_diagnoses_user_created_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_diagnoses_status_created"`,
    );
    await queryRunner.query(`DROP TABLE "diagnoses"`);
  }
}
