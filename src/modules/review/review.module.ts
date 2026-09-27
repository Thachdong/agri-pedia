import { Module } from '@nestjs/common';
import { MediaModule } from '@modules/media/media.module';
import { ProductModule } from '@modules/product/product.module';
import { UserModule } from '@modules/user/user.module';
import { REVIEW_REPOSITORY } from './application/ports';
import {
  CreateReviewUseCase,
  ListDistributorReviewsUseCase,
} from './application/use-cases';
import './infrastructure/http/review.api-docs';
import { ReviewController } from './infrastructure/http/review.controller';
import { PgReviewRepository } from './infrastructure/persistence/pg-review.repository';

@Module({
  imports: [UserModule, ProductModule, MediaModule],
  controllers: [ReviewController],
  providers: [
    CreateReviewUseCase,
    ListDistributorReviewsUseCase,
    { provide: REVIEW_REPOSITORY, useClass: PgReviewRepository },
  ],
  exports: [],
})
export class ReviewModule {}
