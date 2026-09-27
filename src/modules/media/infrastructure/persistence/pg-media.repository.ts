import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { IMediaRepository } from '../../application/ports';
import { Media } from '../../domain';
import { MediaMapper } from './media.mapper';
import { MediaOrmEntity } from './media.orm-entity';

@Injectable()
export class PgMediaRepository
  extends TypeOrmRepositoryBase<MediaOrmEntity>
  implements IMediaRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, MediaOrmEntity);
  }

  async save(media: Media): Promise<void> {
    await this.repository.save(MediaMapper.toOrm(media));
  }
}
