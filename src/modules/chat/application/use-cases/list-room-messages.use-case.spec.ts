import { IMediaQueryPort, TMediaThumbnail } from '@modules/media/contracts';
import { IUserQueryPort, TUserProfileSummary } from '@modules/user/contracts';
import {
  ChatMessage,
  ChatNotRoomMemberException,
  ChatRoom,
  ChatRoomNotFoundException,
  InvalidChatCursorException,
} from '../../domain';
import {
  InMemoryChatMessageRepository,
  InMemoryChatRoomRepository,
} from '../ports/fakes';
import { ListRoomMessagesUseCase } from './list-room-messages.use-case';

const roomId = '00000000-0000-4000-8000-0000000000a1';
const otherRoomId = '00000000-0000-4000-8000-0000000000a2';
const messageId = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const at = (day: number, hour = 0) => new Date(Date.UTC(2026, 0, day, hour));

describe('ListRoomMessagesUseCase', () => {
  let messages: InMemoryChatMessageRepository;
  let rooms: InMemoryChatRoomRepository;
  let useCase: ListRoomMessagesUseCase;
  let profiles: TUserProfileSummary[];
  let avatars: TMediaThumbnail[];
  let profileLookups: string[][];

  beforeEach(() => {
    messages = new InMemoryChatMessageRepository();
    rooms = new InMemoryChatRoomRepository(messages);
    profiles = [];
    avatars = [];
    profileLookups = [];
    const userQuery: IUserQueryPort = {
      findByIdentifier: async () => null,
      findRoleById: async () => null,
      findProfileById: async () => null,
      listProfilesByIds: async (userIds) => {
        profileLookups.push(userIds);
        return profiles.filter((profile) => userIds.includes(profile.userId));
      },
    };
    const mediaQuery: IMediaQueryPort = {
      findUrls: async () => [],
      findThumbnails: async (ownerType, ownerIds) =>
        ownerType === 'USER_AVATAR'
          ? avatars.filter((avatar) => ownerIds.includes(avatar.ownerId))
          : [],
    };
    useCase = new ListRoomMessagesUseCase(
      rooms,
      messages,
      userQuery,
      mediaQuery,
    );
    for (const id of [roomId, otherRoomId]) {
      rooms.items.set(
        id,
        ChatRoom.restore(id, {
          firstUserId: 'farmer',
          secondUserId: id === roomId ? 'shop' : 'other-shop',
          createdAt: at(1),
          lastMessageAt: at(1),
          firstUserLastReadAt: null,
          secondUserLastReadAt: null,
        }),
      );
    }
  });

  const post = (n: number, room: string, senderId: string, createdAt: Date) => {
    const message = ChatMessage.restore(messageId(n), {
      roomId: room,
      senderId,
      message: `msg ${n}`,
      createdAt,
    });
    messages.items.set(message.id, message);
    return message;
  };

  it('lists the messages of the room newest first', async () => {
    profiles.push(
      { userId: 'farmer', username: 'Farmer A', role: 'FARMER' },
      { userId: 'shop', username: 'Shop B', role: 'DISTRIBUTOR' },
    );
    avatars.push({ ownerId: 'shop', url: 'https://cdn/shop.jpg' });
    post(1, roomId, 'farmer', at(2));
    post(2, roomId, 'shop', at(3));
    post(3, otherRoomId, 'farmer', at(4));

    const output = await useCase.execute({
      userId: 'shop',
      roomId,
      limit: 10,
    });

    expect(output).toEqual({
      messages: [
        {
          id: messageId(2),
          senderId: 'shop',
          senderUsername: 'Shop B',
          senderAvatar: 'https://cdn/shop.jpg',
          message: 'msg 2',
          createdAt: at(3),
        },
        {
          id: messageId(1),
          senderId: 'farmer',
          senderUsername: 'Farmer A',
          senderAvatar: null,
          message: 'msg 1',
          createdAt: at(2),
        },
      ],
      nextCursor: null,
    });
  });

  it('looks up each sender once and returns null profile for a missing sender', async () => {
    post(1, roomId, 'farmer', at(2));
    post(2, roomId, 'farmer', at(3));

    const output = await useCase.execute({ userId: 'shop', roomId, limit: 10 });

    expect(profileLookups).toEqual([['farmer']]);
    expect(
      output.messages.map(({ senderUsername, senderAvatar }) => ({
        senderUsername,
        senderAvatar,
      })),
    ).toEqual([
      { senderUsername: null, senderAvatar: null },
      { senderUsername: null, senderAvatar: null },
    ]);
  });

  it('pages with the cursor, ties on createdAt broken by id', async () => {
    post(1, roomId, 'farmer', at(2));
    post(2, roomId, 'shop', at(3));
    post(3, roomId, 'farmer', at(3));
    post(4, roomId, 'shop', at(4));

    const first = await useCase.execute({ userId: 'farmer', roomId, limit: 2 });
    const second = await useCase.execute({
      userId: 'farmer',
      roomId,
      limit: 2,
      cursor: first.nextCursor!,
    });

    expect(first.messages.map((m) => m.id)).toEqual([
      messageId(4),
      messageId(3),
    ]);
    expect(first.nextCursor).toEqual(expect.any(String));
    expect(second.messages.map((m) => m.id)).toEqual([
      messageId(2),
      messageId(1),
    ]);
    expect(second.nextCursor).toBeNull();
  });

  it('returns an empty page for a room without messages', async () => {
    const output = await useCase.execute({
      userId: 'farmer',
      roomId,
      limit: 10,
    });

    expect(output).toEqual({ messages: [], nextCursor: null });
  });

  it('rejects an unknown room', async () => {
    await expect(
      useCase.execute({
        userId: 'farmer',
        roomId: '00000000-0000-4000-8000-0000000000ff',
        limit: 10,
      }),
    ).rejects.toThrow(ChatRoomNotFoundException);
  });

  it('rejects a caller who is not a member of the room', async () => {
    post(1, roomId, 'farmer', at(2));

    await expect(
      useCase.execute({ userId: 'other-shop', roomId, limit: 10 }),
    ).rejects.toThrow(ChatNotRoomMemberException);
  });

  it.each([
    'not-base64-json',
    Buffer.from('{"t":"nope","i":"x"}').toString('base64url'),
    Buffer.from(`{"t":"2026-01-01T00:00:00.000Z","i":"x"}`).toString(
      'base64url',
    ),
  ])('rejects a malformed cursor (%s)', async (cursor) => {
    await expect(
      useCase.execute({ userId: 'farmer', roomId, limit: 10, cursor }),
    ).rejects.toThrow(InvalidChatCursorException);
  });
});
