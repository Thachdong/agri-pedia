import { Module } from '@nestjs/common';
import { UserModule } from '@modules/user/user.module';
import { SendChatMessageUseCase } from './application/use-cases';

@Module({
  imports: [UserModule],
  controllers: [],
  providers: [SendChatMessageUseCase],
  exports: [],
})
export class ChatModule {}
