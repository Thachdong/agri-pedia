import { Module } from '@nestjs/common';
import { ProductModule } from '@modules/product/product.module';
import { UserModule } from '@modules/user/user.module';

@Module({
  imports: [UserModule, ProductModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class ReviewModule {}
