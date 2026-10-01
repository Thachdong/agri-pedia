import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { IMediaRepository } from '../../application/ports';
import { EMediaOwnerType, EMediaType, Media } from '../../domain';
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
    const rows = await this.repository
      .createQueryBuilder('media')
      .where('media.owner_type = :ownerType', { ownerType })
      .andWhere('media.owner_id = :ownerId', { ownerId })
      .orderBy('media.sort_order', 'ASC', 'NULLS LAST')
      .addOrderBy('media.id', 'ASC')
      .getMany();
    return rows.map((row) => MediaMapper.toDomain(row));
  }

  async findFirstImagesByOwners(
    ownerType: EMediaOwnerType,
    ownerIds: string[],
  ): Promise<Media[]> {
    if (ownerIds.length === 0) {
      return [];
    }
    // DISTINCT ON keeps the first row per owner in ORDER BY order.
    const rows = await this.repository
      .createQueryBuilder('media')
      .distinctOn(['media.owner_id'])
      .where('media.owner_type = :ownerType', { ownerType })
      .andWhere('media.owner_id IN (:...ownerIds)', { ownerIds })
      .andWhere('media.type = :type', { type: EMediaType.IMAGE })
      .orderBy('media.owner_id')
      .addOrderBy('media.sort_order', 'ASC', 'NULLS LAST')
      .addOrderBy('media.id', 'ASC')
      .getMany();
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
