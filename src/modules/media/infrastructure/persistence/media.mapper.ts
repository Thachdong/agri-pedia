import { EMediaOwnerType, EMediaType, Media } from '../../domain';
import { MediaOrmEntity } from './media.orm-entity';

export class MediaMapper {
  static toDomain(row: MediaOrmEntity): Media {
    return Media.restore(row.id, {
      type: row.type as EMediaType,
      extension: row.extension,
      filename: row.filename,
      source: row.source,
      ownerType: row.ownerType as EMediaOwnerType,
      ownerId: row.ownerId,
      sortOrder: row.sortOrder,
    });
  }

  static toOrm(media: Media): MediaOrmEntity {
    return Object.assign(new MediaOrmEntity(), {
      id: media.id,
      type: media.type,
      extension: media.extension,
      filename: media.filename,
      source: media.source,
      ownerType: media.ownerType,
      ownerId: media.ownerId,
      sortOrder: media.sortOrder,
    });
  }
}
