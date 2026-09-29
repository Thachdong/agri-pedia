import { Params } from 'nestjs-pino';
import { TAppConfig, TLoggerConfig } from '@config';

/** Query params never written to logs (a caller's location). */
const REDACTED_QUERY_PARAMS = ['lat', 'long'];
const REDACTED = '[Redacted]';

type TSerializedRequest = { url?: string; query?: Record<string, unknown> };

/** Masks REDACTED_QUERY_PARAMS in the serialized request's `url` and `query`. */
export const redactRequestLocation = <T extends TSerializedRequest>(
  req: T,
): T => {
  const [path, search] = (req.url ?? '').split('?', 2);
  if (search === undefined) {
    return req;
  }
  const params = new URLSearchParams(search);
  const hidden = REDACTED_QUERY_PARAMS.filter((name) => params.has(name));
  if (hidden.length === 0) {
    return req;
  }
  hidden.forEach((name) => params.set(name, REDACTED));
  const query = req.query && { ...req.query };
  hidden.forEach((name) => query && name in query && (query[name] = REDACTED));
  return { ...req, url: `${path}?${params.toString()}`, query };
};

/** production: JSON lines to a file. Otherwise: pretty output to the terminal. */
export const buildPinoOptions = (
  app: TAppConfig,
  logger: TLoggerConfig,
): Params => ({
  pinoHttp: {
    level: logger.level,
    redact: ['req.headers.authorization', 'req.headers.cookie'],
    serializers: { req: redactRequestLocation },
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
