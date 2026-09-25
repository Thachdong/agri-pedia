// Entry point for the TypeORM CLI (npm run migration:*). Not imported by the app.
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { databaseConfig } from '../../config/database.config';
import { buildTypeOrmOptions } from './typeorm-options';

export default new DataSource(buildTypeOrmOptions(databaseConfig()));
