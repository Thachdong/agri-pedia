import { Module } from '@nestjs/common';
import { ProductModule } from '@modules/product/product.module';
import { UserModule } from '@modules/user/user.module';
import { CreateReviewUseCase } from './application/use-cases';

@Module({
  imports: [UserModule, ProductModule],
  controllers: [],
  providers: [CreateReviewUseCase],
  exports: [],
})
export class ReviewModule {}
