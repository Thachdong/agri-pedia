import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryLogger } from '@shared/logger';
import { InMemoryFileStorage } from '@shared/storage';
import {
  EMediaOwnerType,
  EMediaType,
  Media,
  MediaExtension,
} from '../../domain';
import { InMemoryMediaRepository } from '../ports/fakes';
import { RemoveMediaUseCase } from './remove-media.use-case';

const productMedia = (ownerId: string): Media =>
  Media.create({
    type: EMediaType.IMAGE,
    extension: MediaExtension.create(EMediaType.IMAGE, 'png'),
    filename: 'front.png',
    ownerType: EMediaOwnerType.PRODUCT,
    ownerId,
  });

describe('RemoveMediaUseCase', () => {
  let media: InMemoryMediaRepository;
  let storage: InMemoryFileStorage;
  let logger: InMemoryLogger;
  let useCase: RemoveMediaUseCase;
  let own: Media;
  let other: Media;

  const remove = (mediaIds: string[]) =>
    useCase.execute({
      ownerType: EMediaOwnerType.PRODUCT,
      ownerId: 'p1',
      mediaIds,
    });

  beforeEach(async () => {
    media = new InMemoryMediaRepository();
    storage = new InMemoryFileStorage();
    logger = new InMemoryLogger();
    own = productMedia('p1');
    other = productMedia('p2');
    for (const item of [own, other]) {
      await media.save(item);
      storage.files.add(item.source);
    }
    useCase = new RemoveMediaUseCase(
      media,
      storage,
      new InMemoryUnitOfWork(),
      logger,
    );
  });

  it('deletes the owner media rows and their storage objects', async () => {
    await remove([own.id]);

    expect(media.items.has(own.id)).toBe(false);
    expect(storage.files.has(own.source)).toBe(false);
  });

  it('ignores ids of another owner and unknown ids', async () => {
    await remove([other.id, 'missing']);

    expect(media.items.has(other.id)).toBe(true);
    expect(storage.files.has(other.source)).toBe(true);
  });

  it('does nothing for an empty list', async () => {
    await remove([]);

    expect(media.items.size).toBe(2);
  });

  it('logs a storage delete failure and keeps the row deleted', async () => {
    jest
      .spyOn(storage, 'deleteFile')
      .mockRejectedValueOnce(new Error('gcs down'));

    await expect(remove([own.id])).resolves.toBeUndefined();

    expect(media.items.has(own.id)).toBe(false);
    expect(logger.entries).toEqual([
      expect.objectContaining({
        level: 'error',
        message: 'Media file delete failed',
        meta: { mediaId: own.id, source: own.source },
      }),
    ]);
  });
});
