import { Injectable } from '@nestjs/common';
import { PinoLogger as NestPinoLogger } from 'nestjs-pino';
import { ILogger, TLogMeta } from './logger.interface';

/** Delegates to nestjs-pino, so entries logged during a request carry its request id. */
@Injectable()
export class PinoLogger implements ILogger {
  private context?: string;

  constructor(private readonly pino: NestPinoLogger) {}

  debug(message: string, meta?: TLogMeta): void {
    this.pino.debug(this.bindings(meta), message);
  }

  info(message: string, meta?: TLogMeta): void {
    this.pino.info(this.bindings(meta), message);
  }

  warn(message: string, meta?: TLogMeta): void {
    this.pino.warn(this.bindings(meta), message);
  }

  error(message: string, error?: unknown, meta?: TLogMeta): void {
    this.pino.error({ ...this.bindings(meta), err: error }, message);
  }

  withContext(context: string): ILogger {
    const logger = new PinoLogger(this.pino);
    logger.context = context;
    return logger;
  }

  private bindings(meta?: TLogMeta): TLogMeta {
    return this.context ? { context: this.context, ...meta } : { ...meta };
  }
}
