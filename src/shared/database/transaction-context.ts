import { AsyncLocalStorage } from 'node:async_hooks';
import { EntityManager } from 'typeorm';

/** Holds the EntityManager of the active transaction for the current async call chain. */
export const transactionContext = new AsyncLocalStorage<EntityManager>();
