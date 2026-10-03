import { Inject, Injectable } from '@nestjs/common';
import { IMediaQueryPort, MEDIA_QUERY_PORT } from '@modules/media/contracts';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { InvalidChatCursorException } from '../../domain';
import {
  CHAT_ROOM_REPOSITORY,
  IChatRoomRepository,
  TChatRoomPageKey,
} from '../ports/chat-room.repository';

export type TListMyChatRoomsInput = {
  userId: string;
  /** `nextCursor` of the previous page; omitted for the first page. */
  cursor?: string;
  limit: number;
};

export type TChatRoomItem = {
  roomId: string;
  otherUserId: string;
  /** Null when the other user no longer exists. */
  otherUsername: string | null;
  /** Signed read URL of the other user's avatar; null when none. */
  otherUserAvatar: string | null;
  lastMessage: { messageId: string; senderId: string; message: string } | null;
  lastMessageAt: Date;
  unreadCount: number;
};

export type TListMyChatRoomsOutput = {
  /** Unread messages over all the caller's rooms, not only this page. */
  totalUnread: number;
  rooms: TChatRoomItem[];
  /** Pass back as `cursor` to get the next page; null on the last page. */
  nextCursor: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Opaque cursor: base64url JSON `{ t: lastMessageAt ISO, i: roomId }`. */
const encodeCursor = (key: TChatRoomPageKey): string =>
  Buffer.from(
    JSON.stringify({ t: key.lastMessageAt.toISOString(), i: key.id }),
  ).toString('base64url');

const decodeCursor = (cursor: string): TChatRoomPageKey => {
  try {
    const { t, i } = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    const lastMessageAt = new Date(t);
    if (
      typeof t !== 'string' ||
      Number.isNaN(lastMessageAt.getTime()) ||
      typeof i !== 'string' ||
      !UUID.test(i)
    ) {
      throw new Error('bad cursor');
    }
    return { lastMessageAt, id: i };
  } catch {
    throw new InvalidChatCursorException();
  }
};

/** The caller's chat rooms, most recent message first, with unread counts and the other member's profile; keyset-paginated. */
@Injectable()
export class ListMyChatRoomsUseCase {
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY) private readonly rooms: IChatRoomRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(MEDIA_QUERY_PORT) private readonly mediaQuery: IMediaQueryPort,
  ) {}

  async execute(input: TListMyChatRoomsInput): Promise<TListMyChatRoomsOutput> {
    const after =
      input.cursor !== undefined ? decodeCursor(input.cursor) : undefined;

    // One extra row tells whether a next page exists.
    const [rows, totalUnread] = await Promise.all([
      this.rooms.findPageByMember(input.userId, {
        after,
        limit: input.limit + 1,
      }),
      this.rooms.countUnreadByMember(input.userId),
    ]);
    const page = rows.slice(0, input.limit);
    const last = page[page.length - 1];
    const nextCursor =
      rows.length > input.limit && last
        ? encodeCursor({
            lastMessageAt: last.room.lastMessageAt,
            id: last.room.id,
          })
        : null;

    const otherUserIds = [
      ...new Set(page.map(({ room }) => room.otherMember(input.userId))),
    ];
    const [profiles, avatars] = await Promise.all([
      this.userQuery.listProfilesByIds(otherUserIds),
      this.mediaQuery.findThumbnails('USER_AVATAR', otherUserIds),
    ]);
    const usernames = new Map(
      profiles.map((profile) => [profile.userId, profile.username]),
    );
    const avatarUrls = new Map(
      avatars.map((avatar) => [avatar.ownerId, avatar.url]),
    );

    return {
      totalUnread,
      rooms: page.map(({ room, lastMessage, unreadCount }) => {
        const otherUserId = room.otherMember(input.userId);
        return {
          roomId: room.id,
          otherUserId,
          otherUsername: usernames.get(otherUserId) ?? null,
          otherUserAvatar: avatarUrls.get(otherUserId) ?? null,
          lastMessage: lastMessage && {
            messageId: lastMessage.id,
            senderId: lastMessage.senderId,
            message: lastMessage.message,
          },
          lastMessageAt: room.lastMessageAt,
          unreadCount,
        };
      }),
      nextCursor,
    };
  }
}
