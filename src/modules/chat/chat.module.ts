import { Module } from '@nestjs/common';
import { MediaModule } from '@modules/media/media.module';
import { UserModule } from '@modules/user/user.module';
import {
  CHAT_MESSAGE_REPOSITORY,
  CHAT_ROOM_REPOSITORY,
} from './application/ports';
import {
  EnterChatRoomUseCase,
  LeaveChatRoomUseCase,
  ListMyChatRoomsUseCase,
  ListRoomMessagesUseCase,
  SendChatMessageUseCase,
} from './application/use-cases';
import './infrastructure/http/chat.api-docs';
import { ChatController } from './infrastructure/http/chat.controller';
import { PgChatMessageRepository } from './infrastructure/persistence/pg-chat-message.repository';
import { PgChatRoomRepository } from './infrastructure/persistence/pg-chat-room.repository';
import { ChatGateway } from './infrastructure/realtime/chat.gateway';

@Module({
  imports: [UserModule, MediaModule],
  controllers: [ChatController],
  providers: [
    SendChatMessageUseCase,
    ListMyChatRoomsUseCase,
    ListRoomMessagesUseCase,
    EnterChatRoomUseCase,
    LeaveChatRoomUseCase,
    ChatGateway,
    { provide: CHAT_ROOM_REPOSITORY, useClass: PgChatRoomRepository },
    { provide: CHAT_MESSAGE_REPOSITORY, useClass: PgChatMessageRepository },
  ],
  exports: [],
})
export class ChatModule {}
