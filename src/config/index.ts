import { appConfig, TAppConfig } from './app.config';
import { authConfig, TAuthConfig } from './auth.config';
import { databaseConfig, TDatabaseConfig } from './database.config';
import { loggerConfig, TLoggerConfig } from './logger.config';
import { otpConfig, TOtpConfig } from './otp.config';
import { securityConfig, TSecurityConfig } from './security.config';

export * from './app.config';
export * from './auth.config';
export * from './database.config';
export * from './logger.config';
export * from './otp.config';
export * from './security.config';

/** Every config group, loaded once by SharedConfigModule. Add new groups here. */
export const configGroups = [
  appConfig,
  databaseConfig,
  loggerConfig,
  securityConfig,
  otpConfig,
  authConfig,
];

/** Namespace -> type map used by IConfigService.get(). Keep in sync with configGroups. */
export type TConfigMap = {
  app: TAppConfig;
  database: TDatabaseConfig;
  logger: TLoggerConfig;
  security: TSecurityConfig;
  otp: TOtpConfig;
  auth: TAuthConfig;
};
