import { Inject, Injectable } from '@nestjs/common';
import {
  ChatRoomNotFoundException,
  InvalidChatCursorException,
} from '../../domain';
import {
  CHAT_MESSAGE_REPOSITORY,
  IChatMessageRepository,
  TChatMessagePageKey,
} from '../ports/chat-message.repository';
import {
  CHAT_ROOM_REPOSITORY,
  IChatRoomRepository,
} from '../ports/chat-room.repository';

export type TListRoomMessagesInput = {
  userId: string;
  roomId: string;
  /** `nextCursor` of the previous page; omitted for the first page. */
  cursor?: string;
  limit: number;
};

export type TRoomMessageItem = {
  id: string;
  senderId: string;
  message: string;
  createdAt: Date;
};

export type TListRoomMessagesOutput = {
  /** Newest first. */
  messages: TRoomMessageItem[];
  /** Pass back as `cursor` to get older messages; null on the last page. */
  nextCursor: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Opaque cursor: base64url JSON `{ t: createdAt ISO, i: messageId }`. */
const encodeCursor = (key: TChatMessagePageKey): string =>
  Buffer.from(
    JSON.stringify({ t: key.createdAt.toISOString(), i: key.id }),
  ).toString('base64url');

const decodeCursor = (cursor: string): TChatMessagePageKey => {
  try {
    const { t, i } = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    const createdAt = new Date(t);
    if (
      typeof t !== 'string' ||
      Number.isNaN(createdAt.getTime()) ||
      typeof i !== 'string' ||
      !UUID.test(i)
    ) {
      throw new Error('bad cursor');
    }
    return { createdAt, id: i };
  } catch {
    throw new InvalidChatCursorException();
  }
};

/** Messages of a room the caller is a member of, newest first; keyset-paginated. Does not mark them read. */
@Injectable()
export class ListRoomMessagesUseCase {
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY) private readonly rooms: IChatRoomRepository,
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly messages: IChatMessageRepository,
  ) {}

  async execute(
    input: TListRoomMessagesInput,
  ): Promise<TListRoomMessagesOutput> {
    const after =
      input.cursor !== undefined ? decodeCursor(input.cursor) : undefined;
    const room = await this.rooms.findById(input.roomId);
    if (!room) {
      throw new ChatRoomNotFoundException(input.roomId);
    }
    room.otherMember(input.userId); // throws if the caller is not a member

    // One extra row tells whether a next page exists.
    const rows = await this.messages.findPageByRoom(room.id, {
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
      messages: page.map((message) => ({
        id: message.id,
        senderId: message.senderId,
        message: message.message,
        createdAt: message.createdAt,
      })),
      nextCursor,
    };
  }
}
