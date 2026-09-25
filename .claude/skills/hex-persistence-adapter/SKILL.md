---
name: hex-persistence-adapter
description: Implement a repository port with TypeORM in src/modules/<module>/infrastructure/persistence/ — ORM entity, domain<->ORM mapper, Pg<X>Repository extending TypeOrmRepositoryBase, token binding, and a generated migration. Use after the port exists (hex-use-case).
---

# hex-persistence-adapter

**Scope:** `infrastructure/persistence/`, port binding in `<module>.module.ts`, one migration in `src/migrations/`. **Out of scope:** changing the port interface or domain model to fit the ORM (report instead).

## Rules
- ORM entity is a separate class `<Entity>OrmEntity` in `<entity>.orm-entity.ts` (the filename suffix is how TypeORM discovers it). Domain classes never get decorators.
- Table name: snake_case plural, owned by this module only. No `@ManyToOne`/FK to another module's table — store the foreign id as a plain column.
- Column names snake_case (`@Column({ name: 'created_at' })`). Use `uuid` PK, `timestamptz` for dates.
- Mapper = pure functions/static class: `toDomain(orm)` uses `<Entity>.restore(...)`; `toOrm(domain)`.
- Repository extends `TypeOrmRepositoryBase` so it joins `IUnitOfWork` transactions. Always use `this.repository`, never `dataSource.getRepository` directly.
- Never return ORM entities from the adapter.
- TypeORM decorators/types are utilities → import from `typeorm` directly here.

## Templates
```ts
// infrastructure/persistence/user.orm-entity.ts
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'users' })
export class UserOrmEntity {
  @PrimaryColumn('uuid') id: string;
  @Column({ unique: true }) email: string;
  @Column() name: string;
  @Column({ type: 'varchar' }) status: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
```
```ts
// infrastructure/persistence/user.mapper.ts
export class UserMapper {
  static toDomain(row: UserOrmEntity): User {
    return User.restore(row.id, {
      email: Email.create(row.email), name: row.name,
      status: row.status as EUserStatus, createdAt: row.createdAt,
    });
  }

  static toOrm(user: User): UserOrmEntity {
    return Object.assign(new UserOrmEntity(), {
      id: user.id, email: user.email.value, name: user.name, status: user.status, createdAt: user.createdAt,
    });
  }
}
```
```ts
// infrastructure/persistence/pg-user.repository.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';

@Injectable()
export class PgUserRepository extends TypeOrmRepositoryBase<UserOrmEntity> implements IUserRepository {
  constructor(dataSource: DataSource) {
    super(dataSource, UserOrmEntity);
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.repository.findOneBy({ email });
    return row ? UserMapper.toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    await this.repository.save(UserMapper.toOrm(user));
  }
}
```

## Wiring
`<module>.module.ts` providers: `{ provide: USER_REPOSITORY, useClass: PgUserRepository }`.

## Migration
1. `docker compose up -d` (if not running).
2. `npm run build && npm run migration:generate -- src/migrations/<module>-<desc>` (e.g. `user-create-users`).
3. Read the generated SQL: only this module's tables, no FK to other modules, `down()` reverses `up()`.
4. `npm run migration:run`.

## Tests
Mapper unit test (`user.mapper.spec.ts`): round-trip domain → orm → domain keeps all fields.

## Steps
ORM entity → mapper (+spec) → repository → binding → migration → `npm run lint && npm test && npm run build`.

## Report
Table + columns, repository methods, migration file name + summary of SQL. Self-test hint: `npm run migration:revert && npm run migration:run`, inspect table in pgAdmin (localhost:5050). Stop.
