import { MigrationInterface, QueryRunner } from 'typeorm';

export class DatasetCreateTrainingSamples1792478058546 implements MigrationInterface {
  name = 'DatasetCreateTrainingSamples1792478058546';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "training_samples" ("id" uuid NOT NULL, "diagnosis_id" uuid NOT NULL, "sort_order" smallint NOT NULL, "crop_type" character varying(50) NOT NULL, "plant_part" character varying(50) NOT NULL, "disease_code" character varying(100) NOT NULL, "variant_code" character varying(100), "confidence_score" real NOT NULL, "regions" jsonb NOT NULL, "image_key" character varying(255) NOT NULL, "label_source" character varying(20) NOT NULL, "provider" character varying(50) NOT NULL, "model" character varying(200) NOT NULL, "prompt_version" character varying(50) NOT NULL, "kb_version" character varying(20) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_dd4fee6a280825b981ae2246399" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_training_samples_diagnosis_sort" ON "training_samples" ("diagnosis_id", "sort_order") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_training_samples_diagnosis_sort"`,
    );
    await queryRunner.query(`DROP TABLE "training_samples"`);
  }
}
