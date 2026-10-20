import {
  IDiagnosisQueryPort,
  TDiagnosisReport,
} from '@modules/diagnosis/contracts';
import {
  ChatDiagnosisNotFoundException,
  ChatMessage,
  ChatMessageNotDiagnosisReportException,
  ChatMessageNotFoundException,
  ChatNotRoomMemberException,
  ChatRoom,
  ChatRoomNotFoundException,
  EChatMessageType,
} from '../../domain';
import {
  InMemoryChatMessageRepository,
  InMemoryChatRoomRepository,
} from '../ports/fakes';
import { GetMessageDiagnosisReportUseCase } from './get-message-diagnosis-report.use-case';

const report = { id: 'd1', status: 'COMPLETED' } as TDiagnosisReport;

describe('GetMessageDiagnosisReportUseCase', () => {
  let rooms: InMemoryChatRoomRepository;
  let messages: InMemoryChatMessageRepository;
  let reports: Map<string, TDiagnosisReport>;
  let useCase: GetMessageDiagnosisReportUseCase;
  let room: ChatRoom;

  beforeEach(() => {
    rooms = new InMemoryChatRoomRepository();
    messages = new InMemoryChatMessageRepository();
    reports = new Map([['d1', report]]);
    const diagnosisQuery: IDiagnosisQueryPort = {
      findOwnership: async () => null,
      findReport: async (id) => reports.get(id) ?? null,
    };
    useCase = new GetMessageDiagnosisReportUseCase(
      rooms,
      messages,
      diagnosisQuery,
    );
    room = ChatRoom.create({ firstUserId: 'farmer', secondUserId: 'shop' });
    rooms.items.set(room.id, room);
  });

  const post = (
    roomId: string,
    type = EChatMessageType.DIAGNOSIS_REPORT,
    diagnosisId: string | null = 'd1',
  ) => {
    const message = ChatMessage.restore(`m${messages.items.size + 1}`, {
      roomId,
      senderId: 'farmer',
      message: 'Báo cáo',
      type,
      diagnosisId,
      createdAt: new Date(),
    });
    messages.items.set(message.id, message);
    return message;
  };

  it.each(['farmer', 'shop'])(
    'returns the shared diagnosis to room member %s',
    async (userId) => {
      const message = post(room.id);

      expect(
        await useCase.execute({
          userId,
          roomId: room.id,
          messageId: message.id,
        }),
      ).toBe(report);
    },
  );

  it('rejects an unknown room', async () => {
    await expect(
      useCase.execute({ userId: 'shop', roomId: 'nope', messageId: 'm1' }),
    ).rejects.toThrow(ChatRoomNotFoundException);
  });

  it('rejects a caller outside the room', async () => {
    const message = post(room.id);

    await expect(
      useCase.execute({
        userId: 'other',
        roomId: room.id,
        messageId: message.id,
      }),
    ).rejects.toThrow(ChatNotRoomMemberException);
  });

  it('rejects a missing message or one of another room', async () => {
    const elsewhere = post('other-room');

    for (const messageId of ['nope', elsewhere.id]) {
      await expect(
        useCase.execute({ userId: 'shop', roomId: room.id, messageId }),
      ).rejects.toThrow(ChatMessageNotFoundException);
    }
  });

  it('rejects a TEXT message', async () => {
    const message = post(room.id, EChatMessageType.TEXT, null);

    await expect(
      useCase.execute({
        userId: 'shop',
        roomId: room.id,
        messageId: message.id,
      }),
    ).rejects.toThrow(ChatMessageNotDiagnosisReportException);
  });

  it('rejects a diagnosis that no longer exists', async () => {
    const message = post(room.id);
    reports.clear();

    await expect(
      useCase.execute({
        userId: 'shop',
        roomId: room.id,
        messageId: message.id,
      }),
    ).rejects.toThrow(ChatDiagnosisNotFoundException);
  });
});
