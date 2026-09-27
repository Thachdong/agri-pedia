import { Module } from '@nestjs/common';
import {
  ConfirmMediaUseCase,
  GetPresignUrlUseCase,
  RemoveAllMediaUseCase,
  RemoveMediaUseCase,
  ReplaceMediaUseCase,
} from './application/use-cases';
import { MEDIA_REPOSITORY } from './application/ports';
import { MEDIA_QUERY_PORT } from './contracts';
import { ProductCreatedHandler } from './infrastructure/handlers/product-created.handler';
import { ProductDeletedHandler } from './infrastructure/handlers/product-deleted.handler';
import { ProductUpdatedHandler } from './infrastructure/handlers/product-updated.handler';
import './infrastructure/http/media.api-docs';
import { MediaController } from './infrastructure/http/media.controller';
import { MediaQueryService } from './infrastructure/queries/media-query.service';
import { PgMediaRepository } from './infrastructure/persistence/pg-media.repository';

@Module({
  imports: [],
  controllers: [MediaController],
  providers: [
    ConfirmMediaUseCase,
    GetPresignUrlUseCase,
    RemoveAllMediaUseCase,
    RemoveMediaUseCase,
    ReplaceMediaUseCase,
    ProductCreatedHandler,
    ProductDeletedHandler,
    ProductUpdatedHandler,
    { provide: MEDIA_REPOSITORY, useClass: PgMediaRepository },
    { provide: MEDIA_QUERY_PORT, useClass: MediaQueryService },
  ],
  exports: [MEDIA_QUERY_PORT],
})
export class MediaModule {}
