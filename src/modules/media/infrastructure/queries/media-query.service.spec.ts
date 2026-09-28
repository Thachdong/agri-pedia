import { InMemoryFileStorage } from '@shared/storage';
import { InMemoryMediaRepository } from '../../application/ports/fakes';
import {
  EMediaOwnerType,
  EMediaType,
  Media,
  MediaExtension,
} from '../../domain';
import { MediaQueryService } from './media-query.service';

const media = (
  ownerId: string,
  type: EMediaType,
  extension: string,
  sortOrder?: number,
  ownerType = EMediaOwnerType.PRODUCT,
): Media =>
  Media.create({
    type,
    extension: MediaExtension.create(type, extension),
    filename: `f.${extension}`,
    ownerType,
    ownerId,
    sortOrder,
  });

describe('MediaQueryService.findThumbnails', () => {
  let repository: InMemoryMediaRepository;
  let service: MediaQueryService;

  beforeEach(() => {
    repository = new InMemoryMediaRepository();
    service = new MediaQueryService(repository, new InMemoryFileStorage());
  });

  it('returns a signed URL of the first image by sortOrder per owner', async () => {
    const video = media('p1', EMediaType.VIDEO, 'mp4', 0);
    const second = media('p1', EMediaType.IMAGE, 'png', 2);
    const first = media('p1', EMediaType.IMAGE, 'jpg', 1);
    const unordered = media('p1', EMediaType.IMAGE, 'png');
    const other = media('p2', EMediaType.IMAGE, 'png');
    for (const item of [video, second, first, unordered, other]) {
      await repository.save(item);
    }

    await expect(
      service.findThumbnails('PRODUCT', ['p1', 'p2']),
    ).resolves.toEqual([
      {
        ownerId: 'p1',
        url: `https://storage.test/${first.source}?signed=read`,
      },
      {
        ownerId: 'p2',
        url: `https://storage.test/${other.source}?signed=read`,
      },
    ]);
  });

  it('leaves out owners without an image', async () => {
    await repository.save(media('p1', EMediaType.VIDEO, 'mp4', 0));

    await expect(
      service.findThumbnails('PRODUCT', ['p1', 'p3']),
    ).resolves.toEqual([]);
  });

  it('returns the avatar of each user, ignoring media of other owner types', async () => {
    const avatar = media(
      'u1',
      EMediaType.IMAGE,
      'jpg',
      undefined,
      EMediaOwnerType.USER_AVATAR,
    );
    const license = media(
      'u1',
      EMediaType.IMAGE,
      'png',
      0,
      EMediaOwnerType.USER_LICENSE,
    );
    await repository.save(avatar);
    await repository.save(license);

    await expect(
      service.findThumbnails('USER_AVATAR', ['u1', 'u2']),
    ).resolves.toEqual([
      { ownerId: 'u1', url: expect.stringContaining(avatar.source) },
    ]);
  });

  it('returns nothing for no owners', async () => {
    await expect(service.findThumbnails('PRODUCT', [])).resolves.toEqual([]);
  });
});
