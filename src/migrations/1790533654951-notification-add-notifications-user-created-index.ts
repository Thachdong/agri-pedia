import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationAddNotificationsUserCreatedIndex1790533654951 implements MigrationInterface {
  name = 'NotificationAddNotificationsUserCreatedIndex1790533654951';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_created_id" ON "notifications" ("user_id", "created_at", "id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_notifications_user_created_id"`,
    );
  }
}
