import { IUnitOfWork } from './unit-of-work.interface';

/** Test fake: runs work directly, no transaction. */
export class InMemoryUnitOfWork implements IUnitOfWork {
  runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return work();
  }
}
