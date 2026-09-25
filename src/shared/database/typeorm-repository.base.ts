import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { transactionContext } from './transaction-context';

/** Base for persistence adapters. `repository` joins the active IUnitOfWork transaction if any. */
export abstract class TypeOrmRepositoryBase<TOrmEntity extends ObjectLiteral> {
  protected constructor(
    private readonly dataSource: DataSource,
    private readonly ormEntity: EntityTarget<TOrmEntity>,
  ) {}

  protected get repository(): Repository<TOrmEntity> {
    const manager = transactionContext.getStore() ?? this.dataSource.manager;
    return manager.getRepository(this.ormEntity);
  }
}
