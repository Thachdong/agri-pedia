import { appConfig, TAppConfig } from './app.config';
import { databaseConfig, TDatabaseConfig } from './database.config';

export * from './app.config';
export * from './database.config';

/** Every config group, loaded once by SharedConfigModule. Add new groups here. */
export const configGroups = [appConfig, databaseConfig];

/** Namespace -> type map used by IConfigService.get(). Keep in sync with configGroups. */
export type TConfigMap = {
  app: TAppConfig;
  database: TDatabaseConfig;
};
