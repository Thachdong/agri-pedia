import { Params } from 'nestjs-pino';
import { TAppConfig, TLoggerConfig } from '@config';

/** production: JSON lines to a file. Otherwise: pretty output to the terminal. */
export const buildPinoOptions = (
  app: TAppConfig,
  logger: TLoggerConfig,
): Params => ({
  pinoHttp: {
    level: logger.level,
    redact: ['req.headers.authorization', 'req.headers.cookie'],
    transport:
      app.nodeEnv === 'production'
        ? {
            target: 'pino/file',
            options: { destination: logger.filePath, mkdir: true },
          }
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:standard',
            },
          },
  },
});
