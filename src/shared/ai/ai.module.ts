import { Global, Module } from '@nestjs/common';
import { AI_CLIENT_FACTORY } from './ai.interface';
import { VercelAiClientFactory } from './vercel-ai.client-factory';

@Global()
@Module({
  providers: [{ provide: AI_CLIENT_FACTORY, useClass: VercelAiClientFactory }],
  exports: [AI_CLIENT_FACTORY],
})
export class AiModule {}
