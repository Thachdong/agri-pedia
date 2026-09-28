import { Module } from '@nestjs/common';
import { UserModule } from '@modules/user/user.module';
import {
  CHAT_MESSAGE_REPOSITORY,
  CHAT_ROOM_REPOSITORY,
} from './application/ports';
import {
  ListMyChatRoomsUseCase,
  SendChatMessageUseCase,
} from './application/use-cases';
import { PgChatMessageRepository } from './infrastructure/persistence/pg-chat-message.repository';
import { PgChatRoomRepository } from './infrastructure/persistence/pg-chat-room.repository';
import { ChatGateway } from './infrastructure/realtime/chat.gateway';

@Module({
  imports: [UserModule],
  controllers: [],
  providers: [
    SendChatMessageUseCase,
    ListMyChatRoomsUseCase,
    ChatGateway,
    { provide: CHAT_ROOM_REPOSITORY, useClass: PgChatRoomRepository },
    { provide: CHAT_MESSAGE_REPOSITORY, useClass: PgChatMessageRepository },
  ],
  exports: [],
})
export class ChatModule {}
