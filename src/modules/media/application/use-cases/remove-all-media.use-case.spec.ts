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
import { RemoveAllMediaUseCase } from './remove-all-media.use-case';

const productMedia = (ownerId: string): Media =>
  Media.create({
    type: EMediaType.IMAGE,
    extension: MediaExtension.create(EMediaType.IMAGE, 'png'),
    filename: 'front.png',
    ownerType: EMediaOwnerType.PRODUCT,
    ownerId,
  });

describe('RemoveAllMediaUseCase', () => {
  let media: InMemoryMediaRepository;
  let storage: InMemoryFileStorage;
  let logger: InMemoryLogger;
  let useCase: RemoveAllMediaUseCase;
  let own: Media[];
  let other: Media;

  const removeAll = (ownerId = 'p1') =>
    useCase.execute({ ownerType: EMediaOwnerType.PRODUCT, ownerId });

  beforeEach(async () => {
    media = new InMemoryMediaRepository();
    storage = new InMemoryFileStorage();
    logger = new InMemoryLogger();
    own = [productMedia('p1'), productMedia('p1')];
    other = productMedia('p2');
    for (const item of [...own, other]) {
      await media.save(item);
      storage.files.add(item.source);
    }
    useCase = new RemoveAllMediaUseCase(
      media,
      storage,
      new InMemoryUnitOfWork(),
      logger,
    );
  });

  it('deletes every media row of the owner and their storage objects', async () => {
    await removeAll();

    expect([...media.items.keys()]).toEqual([other.id]);
    expect([...storage.files]).toEqual([other.source]);
  });

  it('does nothing for an owner without media', async () => {
    await removeAll('p3');

    expect(media.items.size).toBe(3);
    expect(storage.files.size).toBe(3);
  });

  it('logs a storage delete failure and still removes the other files', async () => {
    jest
      .spyOn(storage, 'deleteFile')
      .mockRejectedValueOnce(new Error('gcs down'));

    await expect(removeAll()).resolves.toBeUndefined();

    expect([...media.items.keys()]).toEqual([other.id]);
    expect(storage.files.size).toBe(2);
    expect(logger.entries).toEqual([
      expect.objectContaining({
        level: 'error',
        message: 'Media file delete failed',
        meta: { mediaId: own[0].id, source: own[0].source },
      }),
    ]);
  });
});
