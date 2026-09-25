import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CONFIG_SERVICE, IConfigService } from '../config';
import { buildTypeOrmOptions } from './typeorm-options';
import { TypeOrmUnitOfWork } from './typeorm.unit-of-work';
import { UNIT_OF_WORK } from './unit-of-work.interface';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [CONFIG_SERVICE],
      useFactory: (config: IConfigService) =>
        buildTypeOrmOptions(config.get('database')),
    }),
  ],
  providers: [{ provide: UNIT_OF_WORK, useClass: TypeOrmUnitOfWork }],
  exports: [UNIT_OF_WORK],
})
export class DatabaseModule {}
