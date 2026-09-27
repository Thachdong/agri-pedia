import { Module } from '@nestjs/common';
import { ProductModule } from '@modules/product/product.module';
import { UserModule } from '@modules/user/user.module';
import { REVIEW_REPOSITORY } from './application/ports';
import { CreateReviewUseCase } from './application/use-cases';
import { PgReviewRepository } from './infrastructure/persistence/pg-review.repository';

@Module({
  imports: [UserModule, ProductModule],
  controllers: [],
  providers: [
    CreateReviewUseCase,
    { provide: REVIEW_REPOSITORY, useClass: PgReviewRepository },
  ],
  exports: [],
})
export class ReviewModule {}
