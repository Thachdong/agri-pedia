import {
  EMediaOwnerType,
  EMediaType,
  Media,
  MediaExtension,
} from '../../domain';
import { MediaMapper } from './media.mapper';

describe('MediaMapper', () => {
  it.each([3, undefined])(
    'round-trips domain -> orm -> domain keeping every field (sortOrder %p)',
    (sortOrder) => {
      const media = Media.create({
        type: EMediaType.IMAGE,
        extension: MediaExtension.create(EMediaType.IMAGE, 'png'),
        filename: 'front.png',
        ownerType: EMediaOwnerType.PRODUCT,
        ownerId: '0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10',
        sortOrder,
      });

      expect(MediaMapper.toDomain(MediaMapper.toOrm(media))).toEqual(media);
    },
  );
});
