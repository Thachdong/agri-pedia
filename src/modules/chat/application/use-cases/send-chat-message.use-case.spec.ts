import { IUserQueryPort, TUserRoleSummary } from '@modules/user/contracts';
import { InMemoryUnitOfWork } from '@shared/database';
import {
  InMemoryRealtimeChannels,
  InMemoryRealtimePublisher,
} from '@shared/realtime';
import {
  ChatNotRoomMemberException,
  ChatReceiverNotFoundException,
  ChatRoom,
  ChatRoomNotFoundException,
  ChatRoomOrReceiverRequiredException,
  ChatSenderNotAllowedException,
  InvalidChatMessageException,
  InvalidChatReceiverException,
} from '../../domain';
import { chatRoomChannel } from '../chat-room-channel';
import {
  InMemoryChatMessageRepository,
  InMemoryChatRoomRepository,
} from '../ports/fakes';
import {
  CHAT_MESSAGE_RECEIVED_REALTIME_EVENT,
  SendChatMessageUseCase,
} from './send-chat-message.use-case';

const summary = (
  userId: string,
  role: TUserRoleSummary['role'],
  isActive = true,
): [string, TUserRoleSummary] => [userId, { userId, role, isActive }];

describe('SendChatMessageUseCase', () => {
  let rooms: InMemoryChatRoomRepository;
  let messages: InMemoryChatMessageRepository;
  let realtime: InMemoryRealtimePublisher;
  let channels: InMemoryRealtimeChannels;
  let roles: Map<string, TUserRoleSummary>;
  let useCase: SendChatMessageUseCase;

  beforeEach(() => {
    rooms = new InMemoryChatRoomRepository();
    messages = new InMemoryChatMessageRepository();
    realtime = new InMemoryRealtimePublisher();
    channels = new InMemoryRealtimeChannels();
    roles = new Map([
      summary('farmer-1', 'FARMER'),
      summary('farmer-2', 'FARMER'),
      summary('distributor-1', 'DISTRIBUTOR'),
      summary('distributor-pending', 'DISTRIBUTOR', false),
    ]);
    const userQuery: IUserQueryPort = {
      findByIdentifier: async () => null,
      findRoleById: async (id) => roles.get(id) ?? null,
      findProfileById: async () => null,
      listProfilesByIds: async () => [],
    };
    useCase = new SendChatMessageUseCase(
      rooms,
      messages,
      userQuery,
      new InMemoryUnitOfWork(),
      realtime,
      channels,
    );
  });

  const seedRoom = () => {
    const room = ChatRoom.create({
      firstUserId: 'farmer-1',
      secondUserId: 'distributor-1',
    });
    rooms.items.set(room.id, room);
    return room;
  };

  it('opens a room with the receiver, stores the message and pushes it', async () => {
    const output = await useCase.execute({
      senderId: 'farmer-1',
      receiverId: 'distributor-1',
      message: '  Chào anh  ',
    });

    const room = rooms.items.get(output.roomId);
    expect(room?.firstUserId).toBe('farmer-1');
    expect(room?.secondUserId).toBe('distributor-1');
    const message = messages.items.get(output.messageId);
    expect(message?.message).toBe('Chào anh');
    expect(message?.senderId).toBe('farmer-1');
    expect(output.createdAt).toBe(message?.createdAt);
    expect(realtime.emitted).toEqual([
      {
        userId: 'distributor-1',
        event: CHAT_MESSAGE_RECEIVED_REALTIME_EVENT,
        payload: {
          messageId: output.messageId,
          roomId: output.roomId,
          senderId: 'farmer-1',
          message: 'Chào anh',
          createdAt: output.createdAt.toISOString(),
        },
      },
    ]);
  });

  it('records the message on the room: last message, read by sender, unread by receiver', async () => {
    const output = await useCase.execute({
      senderId: 'farmer-1',
      receiverId: 'distributor-1',
      message: 'Hi',
    });

    const room = rooms.items.get(output.roomId)!;
    expect(room.lastMessageAt).toBe(output.createdAt);
    expect(room.lastReadAtOf('farmer-1')).toBe(output.createdAt);
    expect(room.lastReadAtOf('distributor-1')).toBeNull();
  });

  it('marks the message read by the receiver when they have the room open', async () => {
    const room = seedRoom();
    channels.connect('conn-1', 'distributor-1');
    channels.join('conn-1', chatRoomChannel(room.id));

    const output = await useCase.execute({
      senderId: 'farmer-1',
      roomId: room.id,
      message: 'Hi',
    });

    expect(room.lastReadAtOf('distributor-1')).toBe(output.createdAt);
  });

  it('leaves it unread when the receiver only has another room open', async () => {
    const room = seedRoom();
    channels.connect('conn-1', 'distributor-1');
    channels.join('conn-1', chatRoomChannel('other-room'));

    await useCase.execute({
      senderId: 'farmer-1',
      roomId: room.id,
      message: 'Hi',
    });

    expect(room.lastReadAtOf('distributor-1')).toBeNull();
  });

  it('reuses the room of the pair whoever opened it', async () => {
    const room = seedRoom();

    const output = await useCase.execute({
      senderId: 'distributor-1',
      receiverId: 'farmer-1',
      message: 'Hi',
    });

    expect(output.roomId).toBe(room.id);
    expect(rooms.items.size).toBe(1);
    expect(realtime.emitted[0].userId).toBe('farmer-1');
  });

  it('sends into an existing room by roomId', async () => {
    const room = seedRoom();

    const output = await useCase.execute({
      senderId: 'distributor-1',
      roomId: room.id,
      message: 'Hi',
    });

    expect(output.roomId).toBe(room.id);
    expect(messages.items.size).toBe(1);
    expect(realtime.emitted[0].userId).toBe('farmer-1');
  });

  it('prefers roomId over receiverId', async () => {
    const room = seedRoom();

    const output = await useCase.execute({
      senderId: 'farmer-1',
      roomId: room.id,
      receiverId: 'unknown',
      message: 'Hi',
    });

    expect(output.roomId).toBe(room.id);
  });

  it('requires roomId or receiverId', async () => {
    await expect(
      useCase.execute({ senderId: 'farmer-1', message: 'Hi' }),
    ).rejects.toThrow(ChatRoomOrReceiverRequiredException);
  });

  it.each(['unknown', 'distributor-pending'])(
    'rejects sender %s (missing or not ACTIVE)',
    async (senderId) => {
      await expect(
        useCase.execute({ senderId, receiverId: 'farmer-1', message: 'Hi' }),
      ).rejects.toThrow(ChatSenderNotAllowedException);
    },
  );

  it('rejects an unknown room', async () => {
    await expect(
      useCase.execute({ senderId: 'farmer-1', roomId: 'nope', message: 'Hi' }),
    ).rejects.toThrow(ChatRoomNotFoundException);
  });

  it('rejects a sender outside the room without storing anything', async () => {
    const room = seedRoom();

    await expect(
      useCase.execute({ senderId: 'farmer-2', roomId: room.id, message: 'Hi' }),
    ).rejects.toThrow(ChatNotRoomMemberException);
    expect(messages.items.size).toBe(0);
    expect(realtime.emitted).toEqual([]);
  });

  it('rejects an unknown receiver', async () => {
    await expect(
      useCase.execute({
        senderId: 'farmer-1',
        receiverId: 'unknown',
        message: 'Hi',
      }),
    ).rejects.toThrow(ChatReceiverNotFoundException);
  });

  it.each([
    ['oneself', 'farmer-1'],
    ['same role', 'farmer-2'],
    ['not ACTIVE', 'distributor-pending'],
  ])('rejects a receiver: %s', async (_case, receiverId) => {
    await expect(
      useCase.execute({ senderId: 'farmer-1', receiverId, message: 'Hi' }),
    ).rejects.toThrow(InvalidChatReceiverException);
    expect(rooms.items.size).toBe(0);
  });

  it('rejects an empty message without pushing', async () => {
    const room = seedRoom();

    await expect(
      useCase.execute({ senderId: 'farmer-1', roomId: room.id, message: ' ' }),
    ).rejects.toThrow(InvalidChatMessageException);
    expect(messages.items.size).toBe(0);
    expect(realtime.emitted).toEqual([]);
  });
});
