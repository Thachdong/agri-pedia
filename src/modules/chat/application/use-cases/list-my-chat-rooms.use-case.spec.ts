import { IMediaQueryPort, TMediaThumbnail } from '@modules/media/contracts';
import { IUserQueryPort, TUserProfileSummary } from '@modules/user/contracts';
import {
  ChatMessage,
  ChatRoom,
  InvalidChatCursorException,
} from '../../domain';
import {
  InMemoryChatMessageRepository,
  InMemoryChatRoomRepository,
} from '../ports/fakes';
import { ListMyChatRoomsUseCase } from './list-my-chat-rooms.use-case';

const ids = {
  r1: '00000000-0000-4000-8000-000000000001',
  r2: '00000000-0000-4000-8000-000000000002',
  r3: '00000000-0000-4000-8000-000000000003',
  r4: '00000000-0000-4000-8000-000000000004',
};

const at = (day: number, hour = 0) => new Date(Date.UTC(2026, 0, day, hour));

describe('ListMyChatRoomsUseCase', () => {
  let messages: InMemoryChatMessageRepository;
  let rooms: InMemoryChatRoomRepository;
  let useCase: ListMyChatRoomsUseCase;
  let profiles: TUserProfileSummary[];
  let avatars: TMediaThumbnail[];

  beforeEach(() => {
    messages = new InMemoryChatMessageRepository();
    rooms = new InMemoryChatRoomRepository(messages);
    profiles = [];
    avatars = [];
    const userQuery: IUserQueryPort = {
      findByIdentifier: async () => null,
      findRoleById: async () => null,
      findProfileById: async () => null,
      listProfilesByIds: async (userIds) =>
        profiles.filter((profile) => userIds.includes(profile.userId)),
    };
    const mediaQuery: IMediaQueryPort = {
      findUrls: async () => [],
      findThumbnails: async (ownerType, ownerIds) =>
        ownerType === 'USER_AVATAR'
          ? avatars.filter((avatar) => ownerIds.includes(avatar.ownerId))
          : [],
    };
    useCase = new ListMyChatRoomsUseCase(rooms, userQuery, mediaQuery);
  });

  const seedRoom = (
    id: string,
    firstUserId: string,
    secondUserId: string,
    reads: { first?: Date; second?: Date } = {},
  ) => {
    const room = ChatRoom.restore(id, {
      firstUserId,
      secondUserId,
      createdAt: at(1),
      lastMessageAt: at(1),
      firstUserLastReadAt: reads.first ?? null,
      secondUserLastReadAt: reads.second ?? null,
    });
    rooms.items.set(id, room);
    return room;
  };

  let seq = 0;
  const post = (room: ChatRoom, senderId: string, createdAt: Date) => {
    const message = ChatMessage.restore(`m${++seq}`, {
      roomId: room.id,
      senderId,
      message: `msg ${seq}`,
      createdAt,
    });
    messages.items.set(message.id, message);
    room.recordMessage(message);
    return message;
  };

  it('lists my rooms newest message first with last message and unread counts', async () => {
    const withShopA = seedRoom(ids.r1, 'farmer', 'shop-a');
    const withShopB = seedRoom(ids.r2, 'shop-b', 'farmer', {
      second: at(3),
    });
    seedRoom(ids.r3, 'other', 'shop-a');
    post(withShopA, 'shop-a', at(2));
    post(withShopA, 'shop-a', at(2, 1));
    post(withShopB, 'shop-b', at(2, 5)); // before my marker: read
    post(withShopB, 'farmer', at(4));
    const newest = post(withShopB, 'shop-b', at(5));

    const output = await useCase.execute({ userId: 'farmer', limit: 10 });

    expect(output).toEqual({
      totalUnread: 3,
      rooms: [
        {
          roomId: ids.r2,
          otherUserId: 'shop-b',
          otherUsername: null,
          otherUserAvatar: null,
          lastMessage: {
            messageId: newest.id,
            senderId: 'shop-b',
            message: newest.message,
          },
          lastMessageAt: at(5),
          unreadCount: 1,
        },
        expect.objectContaining({
          roomId: ids.r1,
          otherUserId: 'shop-a',
          lastMessageAt: at(2, 1),
          unreadCount: 2,
        }),
      ],
      nextCursor: null,
    });
  });

  it("adds the other member's username and avatar", async () => {
    const withShopA = seedRoom(ids.r1, 'farmer', 'shop-a');
    const withShopB = seedRoom(ids.r2, 'shop-b', 'farmer');
    post(withShopA, 'shop-a', at(3));
    post(withShopB, 'shop-b', at(2));
    profiles = [
      { userId: 'shop-a', username: 'Shop A', role: 'DISTRIBUTOR' },
      { userId: 'shop-b', username: 'Shop B', role: 'DISTRIBUTOR' },
      { userId: 'farmer', username: 'Me', role: 'FARMER' },
    ];
    avatars = [{ ownerId: 'shop-a', url: 'https://avatar/shop-a' }];

    const output = await useCase.execute({ userId: 'farmer', limit: 10 });

    expect(
      output.rooms.map(({ otherUserId, otherUsername, otherUserAvatar }) => ({
        otherUserId,
        otherUsername,
        otherUserAvatar,
      })),
    ).toEqual([
      {
        otherUserId: 'shop-a',
        otherUsername: 'Shop A',
        otherUserAvatar: 'https://avatar/shop-a',
      },
      { otherUserId: 'shop-b', otherUsername: 'Shop B', otherUserAvatar: null },
    ]);
  });

  it('never counts my own messages as unread', async () => {
    const room = seedRoom(ids.r1, 'farmer', 'shop-a');
    post(room, 'farmer', at(2));

    const output = await useCase.execute({ userId: 'farmer', limit: 10 });

    expect(output.totalUnread).toBe(0);
    expect(output.rooms[0].unreadCount).toBe(0);
  });

  it('pages with a cursor; totalUnread covers every room', async () => {
    const r1 = seedRoom(ids.r1, 'farmer', 's1');
    const r2 = seedRoom(ids.r2, 'farmer', 's2');
    const r3 = seedRoom(ids.r3, 'farmer', 's3');
    const r4 = seedRoom(ids.r4, 'farmer', 's4');
    post(r1, 's1', at(4));
    post(r2, 's2', at(3));
    post(r3, 's3', at(3)); // same time as r2: id desc breaks the tie
    post(r4, 's4', at(2));

    const first = await useCase.execute({ userId: 'farmer', limit: 2 });
    const second = await useCase.execute({
      userId: 'farmer',
      limit: 2,
      cursor: first.nextCursor!,
    });

    expect(first.rooms.map((room) => room.roomId)).toEqual([ids.r1, ids.r3]);
    expect(first.totalUnread).toBe(4);
    expect(second.rooms.map((room) => room.roomId)).toEqual([ids.r2, ids.r4]);
    expect(second.nextCursor).toBeNull();
  });

  it('returns an empty page for a user without rooms', async () => {
    expect(await useCase.execute({ userId: 'nobody', limit: 10 })).toEqual({
      totalUnread: 0,
      rooms: [],
      nextCursor: null,
    });
  });

  it.each([
    'not-base64-json',
    Buffer.from(JSON.stringify({ t: 'x', i: ids.r1 })).toString('base64url'),
    Buffer.from(JSON.stringify({ t: at(1).toISOString(), i: 'x' })).toString(
      'base64url',
    ),
  ])('rejects a bad cursor %s', async (cursor) => {
    await expect(
      useCase.execute({ userId: 'farmer', limit: 10, cursor }),
    ).rejects.toThrow(InvalidChatCursorException);
  });
});
