import { EMediaOwnerType } from '../enums/media-owner-type.enum';
import { EMediaType } from '../enums/media-type.enum';
import { MediaExtension } from '../value-objects/media-extension.vo';
import { Media } from './media.entity';

describe('Media.create', () => {
  it('derives the source key from owner folder, owner id and new id', () => {
    const media = Media.create({
      type: EMediaType.IMAGE,
      extension: MediaExtension.create(EMediaType.IMAGE, '.PNG'),
      filename: ' front.png ',
      ownerType: EMediaOwnerType.PRODUCT,
      ownerId: 'p1',
      sortOrder: 2,
    });

    expect(media.source).toBe(`products/p1/${media.id}.png`);
    expect(media).toMatchObject({
      type: EMediaType.IMAGE,
      extension: 'png',
      filename: 'front.png',
      ownerType: EMediaOwnerType.PRODUCT,
      ownerId: 'p1',
      sortOrder: 2,
    });
  });

  it('keeps a given id and stores user media under the users folder', () => {
    const media = Media.create({
      id: 'm1',
      type: EMediaType.IMAGE,
      extension: MediaExtension.create(EMediaType.IMAGE, 'jpg'),
      filename: 'me.jpg',
      ownerType: EMediaOwnerType.USER_AVATAR,
      ownerId: 'u1',
    });

    expect(media.id).toBe('m1');
    expect(media.source).toBe('users/u1/m1.jpg');
  });

  it('defaults sortOrder to null', () => {
    const media = Media.create({
      type: EMediaType.FILE,
      extension: MediaExtension.create(EMediaType.FILE, 'pdf'),
      filename: 'spec.pdf',
      ownerType: EMediaOwnerType.PRODUCT,
      ownerId: 'p1',
    });

    expect(media.sortOrder).toBeNull();
  });
});

describe('Media.restore', () => {
  it('rebuilds media as stored', () => {
    const media = Media.restore('m1', {
      type: EMediaType.IMAGE,
      extension: 'png',
      filename: 'a.png',
      source: 'products/p1/m1.png',
      ownerType: EMediaOwnerType.PRODUCT,
      ownerId: 'p1',
      sortOrder: null,
    });

    expect(media.id).toBe('m1');
    expect(media.source).toBe('products/p1/m1.png');
  });
});
