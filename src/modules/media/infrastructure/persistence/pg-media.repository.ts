import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { IMediaRepository } from '../../application/ports';
import { EMediaOwnerType, Media } from '../../domain';
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

  async findByOwner(
    ownerType: EMediaOwnerType,
    ownerId: string,
    ids: string[],
  ): Promise<Media[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.repository.findBy({
      ownerType,
      ownerId,
      id: In(ids),
    });
    return rows.map((row) => MediaMapper.toDomain(row));
  }

  async findAllByOwner(
    ownerType: EMediaOwnerType,
    ownerId: string,
  ): Promise<Media[]> {
    const rows = await this.repository.findBy({ ownerType, ownerId });
    return rows.map((row) => MediaMapper.toDomain(row));
  }

  async save(media: Media): Promise<void> {
    await this.repository.save(MediaMapper.toOrm(media));
  }

  async delete(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await this.repository.delete({ id: In(ids) });
  }
}
