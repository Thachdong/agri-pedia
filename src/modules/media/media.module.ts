import { Module } from '@nestjs/common';
import {
  ConfirmMediaUseCase,
  GetPresignUrlUseCase,
  RemoveAllMediaUseCase,
  RemoveMediaUseCase,
} from './application/use-cases';
import { MEDIA_REPOSITORY } from './application/ports';
import { ProductCreatedHandler } from './infrastructure/handlers/product-created.handler';
import { ProductUpdatedHandler } from './infrastructure/handlers/product-updated.handler';
import './infrastructure/http/media.api-docs';
import { MediaController } from './infrastructure/http/media.controller';
import { PgMediaRepository } from './infrastructure/persistence/pg-media.repository';

@Module({
  imports: [],
  controllers: [MediaController],
  providers: [
    ConfirmMediaUseCase,
    GetPresignUrlUseCase,
    RemoveAllMediaUseCase,
    RemoveMediaUseCase,
    ProductCreatedHandler,
    ProductUpdatedHandler,
    { provide: MEDIA_REPOSITORY, useClass: PgMediaRepository },
  ],
  exports: [],
})
export class MediaModule {}
