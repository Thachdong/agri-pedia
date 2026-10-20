import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChatMessageType1792463518949 implements MigrationInterface {
  name = 'ChatMessageType1792463518949';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD "type" character varying(30) NOT NULL DEFAULT 'TEXT'`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD "diagnosis_id" uuid`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat_messages" DROP COLUMN "diagnosis_id"`,
    );
    await queryRunner.query(`ALTER TABLE "chat_messages" DROP COLUMN "type"`);
  }
}
