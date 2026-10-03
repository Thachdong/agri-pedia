import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationCreateNotifications1790532968564 implements MigrationInterface {
  name = 'NotificationCreateNotifications1790532968564';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL, "user_id" uuid NOT NULL, "type" character varying(16) NOT NULL, "label" character varying(255) NOT NULL, "content" text NOT NULL, "reference_id" uuid, "is_read" boolean NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
