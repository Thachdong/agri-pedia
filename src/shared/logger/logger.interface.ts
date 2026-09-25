export type TLogMeta = Record<string, unknown>;

export interface ILogger {
  debug(message: string, meta?: TLogMeta): void;
  info(message: string, meta?: TLogMeta): void;
  warn(message: string, meta?: TLogMeta): void;
  error(message: string, error?: unknown, meta?: TLogMeta): void;
  /** Returns a logger tagging every entry with `context` (usually the class name). */
  withContext(context: string): ILogger;
}

export const LOGGER = Symbol('LOGGER');
