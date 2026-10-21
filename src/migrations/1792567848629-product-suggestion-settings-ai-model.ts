import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductSuggestionSettingsAiModel1792567848629 implements MigrationInterface {
  name = 'ProductSuggestionSettingsAiModel1792567848629';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_suggestion_settings" ADD "model" character varying(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_suggestion_settings" DROP COLUMN "model"`,
    );
  }
}
