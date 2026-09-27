import { Module } from '@nestjs/common';
import {
  ConfirmMediaUseCase,
  GetPresignUrlUseCase,
} from './application/use-cases';
import './infrastructure/http/media.api-docs';
import { MediaController } from './infrastructure/http/media.controller';

@Module({
  imports: [],
  controllers: [MediaController],
  providers: [ConfirmMediaUseCase, GetPresignUrlUseCase],
  exports: [],
})
export class MediaModule {}
