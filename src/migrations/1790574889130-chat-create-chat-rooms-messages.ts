import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChatCreateChatRoomsMessages1790574889130 implements MigrationInterface {
  name = 'ChatCreateChatRoomsMessages1790574889130';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "chat_rooms" ("id" uuid NOT NULL, "first_user_id" uuid NOT NULL, "second_user_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_c69082bd83bffeb71b0f455bd59" PRIMARY KEY ("id"))`,
    );
    // Hand-written (expression index, synchronize: false on the entity): one room per pair in any order.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_chat_rooms_members" ON "chat_rooms" (LEAST("first_user_id", "second_user_id"), GREATEST("first_user_id", "second_user_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "chat_messages" ("id" uuid NOT NULL, "room_id" uuid NOT NULL, "sender_id" uuid NOT NULL, "message" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_40c55ee0e571e268b0d3cd37d10" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "chat_messages"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_chat_rooms_members"`);
    await queryRunner.query(`DROP TABLE "chat_rooms"`);
  }
}
