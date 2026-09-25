import { Module } from '@nestjs/common';
import { IssueOtpUseCase } from './application/use-cases';

@Module({
  imports: [],
  controllers: [],
  providers: [IssueOtpUseCase],
  exports: [],
})
export class OtpModule {}
