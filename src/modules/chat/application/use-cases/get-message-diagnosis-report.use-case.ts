import { Inject, Injectable } from '@nestjs/common';
import {
  DIAGNOSIS_QUERY_PORT,
  IDiagnosisQueryPort,
  TDiagnosisReport,
} from '@modules/diagnosis/contracts';
import {
  ChatDiagnosisNotFoundException,
  ChatMessageNotDiagnosisReportException,
  ChatMessageNotFoundException,
  ChatRoomNotFoundException,
  EChatMessageType,
} from '../../domain';
import {
  CHAT_MESSAGE_REPOSITORY,
  IChatMessageRepository,
} from '../ports/chat-message.repository';
import {
  CHAT_ROOM_REPOSITORY,
  IChatRoomRepository,
} from '../ports/chat-room.repository';

export type TGetMessageDiagnosisReportInput = {
  userId: string;
  roomId: string;
  messageId: string;
};

export type TGetMessageDiagnosisReportOutput = TDiagnosisReport;

/** The diagnosis shared by a DIAGNOSIS_REPORT message, for either member of its room (as of now, not as sent). */
@Injectable()
export class GetMessageDiagnosisReportUseCase {
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY) private readonly rooms: IChatRoomRepository,
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly messages: IChatMessageRepository,
    @Inject(DIAGNOSIS_QUERY_PORT)
    private readonly diagnosisQuery: IDiagnosisQueryPort,
  ) {}

  async execute(
    input: TGetMessageDiagnosisReportInput,
  ): Promise<TGetMessageDiagnosisReportOutput> {
    const room = await this.rooms.findById(input.roomId);
    if (!room) {
      throw new ChatRoomNotFoundException(input.roomId);
    }
    room.otherMember(input.userId); // throws if the caller is not a member

    const message = await this.messages.findById(input.messageId);
    if (!message || message.roomId !== room.id) {
      throw new ChatMessageNotFoundException(room.id, input.messageId);
    }
    if (
      message.type !== EChatMessageType.DIAGNOSIS_REPORT ||
      message.diagnosisId === null
    ) {
      throw new ChatMessageNotDiagnosisReportException(message.id);
    }

    const report = await this.diagnosisQuery.findReport(message.diagnosisId);
    if (!report) {
      throw new ChatDiagnosisNotFoundException(message.diagnosisId);
    }
    return report;
  }
}
