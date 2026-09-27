import { Module } from '@nestjs/common';
import {
  ConfirmMediaUseCase,
  GetPresignUrlUseCase,
} from './application/use-cases';
import { MEDIA_REPOSITORY } from './application/ports';
import './infrastructure/http/media.api-docs';
import { MediaController } from './infrastructure/http/media.controller';
import { PgMediaRepository } from './infrastructure/persistence/pg-media.repository';

@Module({
  imports: [],
  controllers: [MediaController],
  providers: [
    ConfirmMediaUseCase,
    GetPresignUrlUseCase,
    { provide: MEDIA_REPOSITORY, useClass: PgMediaRepository },
  ],
  exports: [],
})
export class MediaModule {}
