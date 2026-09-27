import { Module } from '@nestjs/common';
import { GetPresignUrlUseCase } from './application/use-cases';
import { MediaController } from './infrastructure/http/media.controller';

@Module({
  imports: [],
  controllers: [MediaController],
  providers: [GetPresignUrlUseCase],
  exports: [],
})
export class MediaModule {}
