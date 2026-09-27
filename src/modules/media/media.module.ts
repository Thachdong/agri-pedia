import { Module } from '@nestjs/common';
import { GetPresignUrlUseCase } from './application/use-cases';

@Module({
  imports: [],
  controllers: [],
  providers: [GetPresignUrlUseCase],
  exports: [],
})
export class MediaModule {}
