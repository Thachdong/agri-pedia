import { Inject, Injectable } from '@nestjs/common';
import {
  ENotificationType,
  InvalidNotificationCursorException,
} from '../../domain';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
  TNotificationPageKey,
} from '../ports/notification.repository';

export type TListMyNotificationsInput = {
  userId: string;
  /** `nextCursor` of the previous page; omitted for the first page. */
  cursor?: string;
  limit: number;
};

export type TNotificationItem = {
  id: string;
  type: ENotificationType;
  label: string;
  content: string;
  isRead: boolean;
  referenceId: string | null;
  createdAt: Date;
};

export type TListMyNotificationsOutput = {
  notifications: TNotificationItem[];
  /** Pass back as `cursor` to get the next page; null on the last page. */
  nextCursor: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Opaque cursor: base64url JSON `{ c: createdAt ISO, i: id }`. */
const encodeCursor = (key: TNotificationPageKey): string =>
  Buffer.from(
    JSON.stringify({ c: key.createdAt.toISOString(), i: key.id }),
  ).toString('base64url');

const decodeCursor = (cursor: string): TNotificationPageKey => {
  try {
    const { c, i } = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    const createdAt = new Date(c);
    if (
      typeof c !== 'string' ||
      Number.isNaN(createdAt.getTime()) ||
      typeof i !== 'string' ||
      !UUID.test(i)
    ) {
      throw new Error('bad cursor');
    }
    return { createdAt, id: i };
  } catch {
    throw new InvalidNotificationCursorException();
  }
};

/** The caller's own notifications (read and unread), newest first, keyset-paginated. */
@Injectable()
export class ListMyNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: INotificationRepository,
  ) {}

  async execute(
    input: TListMyNotificationsInput,
  ): Promise<TListMyNotificationsOutput> {
    const after =
      input.cursor !== undefined ? decodeCursor(input.cursor) : undefined;

    // One extra row tells whether a next page exists.
    const rows = await this.notifications.findByUser(input.userId, {
      after,
      limit: input.limit + 1,
    });
    const page = rows.slice(0, input.limit);
    const last = page[page.length - 1];
    const nextCursor =
      rows.length > input.limit && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null;

    return {
      notifications: page.map((notification) => ({
        id: notification.id,
        type: notification.type,
        label: notification.label,
        content: notification.content,
        isRead: notification.isRead,
        referenceId: notification.referenceId,
        createdAt: notification.createdAt,
      })),
      nextCursor,
    };
  }
}
