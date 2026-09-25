export interface IUnitOfWork {
  /** Runs `work` in one DB transaction. Repositories called inside join it automatically. */
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');
