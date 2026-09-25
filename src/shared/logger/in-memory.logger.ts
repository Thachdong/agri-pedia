import { ILogger, TLogMeta } from './logger.interface';

export type TLogEntry = {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: string;
  error?: unknown;
  meta?: TLogMeta;
};

/** Test fake: records entries. Loggers created by withContext share the same `entries`. */
export class InMemoryLogger implements ILogger {
  constructor(
    readonly entries: TLogEntry[] = [],
    private readonly context?: string,
  ) {}

  debug(message: string, meta?: TLogMeta): void {
    this.entries.push({ level: 'debug', message, context: this.context, meta });
  }

  info(message: string, meta?: TLogMeta): void {
    this.entries.push({ level: 'info', message, context: this.context, meta });
  }

  warn(message: string, meta?: TLogMeta): void {
    this.entries.push({ level: 'warn', message, context: this.context, meta });
  }

  error(message: string, error?: unknown, meta?: TLogMeta): void {
    this.entries.push({
      level: 'error',
      message,
      context: this.context,
      error,
      meta,
    });
  }

  withContext(context: string): ILogger {
    return new InMemoryLogger(this.entries, context);
  }
}
