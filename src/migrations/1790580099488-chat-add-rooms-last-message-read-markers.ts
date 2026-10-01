import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChatAddRoomsLastMessageReadMarkers1790580099488 implements MigrationInterface {
  name = 'ChatAddRoomsLastMessageReadMarkers1790580099488';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Hand-edited: existing rooms get their newest message time (room creation if none), then NOT NULL.
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" ADD "last_message_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `UPDATE "chat_rooms" r SET "last_message_at" = COALESCE((SELECT MAX(m."created_at") FROM "chat_messages" m WHERE m."room_id" = r."id"), r."created_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" ALTER COLUMN "last_message_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" ADD "first_user_last_read_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" ADD "second_user_last_read_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_messages_room_created" ON "chat_messages" ("room_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_rooms_second_user_last_message" ON "chat_rooms" ("second_user_id", "last_message_at", "id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_rooms_first_user_last_message" ON "chat_rooms" ("first_user_id", "last_message_at", "id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_chat_rooms_first_user_last_message"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_chat_rooms_second_user_last_message"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_chat_messages_room_created"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" DROP COLUMN "second_user_last_read_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" DROP COLUMN "first_user_last_read_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" DROP COLUMN "last_message_at"`,
    );
  }
}
