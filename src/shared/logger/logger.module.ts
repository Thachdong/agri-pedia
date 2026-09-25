import { Global, INestApplication, Module } from '@nestjs/common';
import { LoggerModule, Logger as NestPinoAppLogger } from 'nestjs-pino';
import { CONFIG_SERVICE, IConfigService } from '../config';
import { LOGGER } from './logger.interface';
import { buildPinoOptions } from './pino-options';
import { PinoLogger } from './pino.logger';

@Global()
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [CONFIG_SERVICE],
      useFactory: (config: IConfigService) =>
        buildPinoOptions(config.get('app'), config.get('logger')),
    }),
  ],
  providers: [{ provide: LOGGER, useClass: PinoLogger }],
  exports: [LOGGER],
})
export class SharedLoggerModule {}

/** Routes Nest's own logs (bootstrap, `Logger` static calls) through pino. Call once in main.ts. */
export const useAppLogger = (app: INestApplication): void => {
  app.useLogger(app.get(NestPinoAppLogger));
};
