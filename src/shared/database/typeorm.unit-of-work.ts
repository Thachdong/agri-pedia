import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { transactionContext } from './transaction-context';
import { IUnitOfWork } from './unit-of-work.interface';

@Injectable()
export class TypeOrmUnitOfWork implements IUnitOfWork {
  constructor(private readonly dataSource: DataSource) {}

  runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    if (transactionContext.getStore()) {
      return work();
    }
    return this.dataSource.transaction((manager) =>
      transactionContext.run(manager, work),
    );
  }
}
