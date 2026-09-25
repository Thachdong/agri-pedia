import { appConfig, TAppConfig } from './app.config';
import { databaseConfig, TDatabaseConfig } from './database.config';
import { loggerConfig, TLoggerConfig } from './logger.config';

export * from './app.config';
export * from './database.config';
export * from './logger.config';

/** Every config group, loaded once by SharedConfigModule. Add new groups here. */
export const configGroups = [appConfig, databaseConfig, loggerConfig];

/** Namespace -> type map used by IConfigService.get(). Keep in sync with configGroups. */
export type TConfigMap = {
  app: TAppConfig;
  database: TDatabaseConfig;
  logger: TLoggerConfig;
};
