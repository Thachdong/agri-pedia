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
import {
  ReplaceMediaUseCase,
  TReplaceMediaInput,
} from './replace-media.use-case';

const tmpKey = (userId: string) =>
  `tmp/${userId}/00000000-0000-4000-8000-000000000001.png`;

const NEW_ID = '11111111-1111-4111-8111-111111111111';

const existing = (ownerType: EMediaOwnerType, ownerId: string): Media =>
  Media.create({
    type: EMediaType.IMAGE,
    extension: MediaExtension.create(EMediaType.IMAGE, 'jpg'),
    filename: 'old.jpg',
    ownerType,
    ownerId,
  });

describe('ReplaceMediaUseCase', () => {
  let media: InMemoryMediaRepository;
  let storage: InMemoryFileStorage;
  let logger: InMemoryLogger;
  let useCase: ReplaceMediaUseCase;
  let oldAvatar: Media;
  let license: Media;

  const replace = (file: Partial<TReplaceMediaInput['file']> = {}) =>
    useCase.execute({
      uploaderId: 'u1',
      ownerType: EMediaOwnerType.USER_AVATAR,
      ownerId: 'u1',
      file: {
        mediaId: NEW_ID,
        key: tmpKey('u1'),
        type: EMediaType.IMAGE,
        extension: 'png',
        filename: 'me.png',
        ...file,
      },
    });

  beforeEach(async () => {
    media = new InMemoryMediaRepository();
    storage = new InMemoryFileStorage();
    logger = new InMemoryLogger();
    oldAvatar = existing(EMediaOwnerType.USER_AVATAR, 'u1');
    license = existing(EMediaOwnerType.USER_LICENSE, 'u1');
    for (const item of [oldAvatar, license]) {
      await media.save(item);
      storage.files.add(item.source);
    }
    storage.files.add(tmpKey('u1'));
    useCase = new ReplaceMediaUseCase(
      media,
      storage,
      new InMemoryUnitOfWork(),
      logger,
    );
  });

  it('records the new file with the given id and deletes the old media of that owner', async () => {
    await replace();

    const saved = media.items.get(NEW_ID);
    expect(saved).toMatchObject({
      source: `users/u1/${NEW_ID}.png`,
      ownerType: EMediaOwnerType.USER_AVATAR,
      ownerId: 'u1',
      filename: 'me.png',
    });
    expect([...media.items.keys()].sort()).toEqual([NEW_ID, license.id].sort());
    expect([...storage.files].sort()).toEqual(
      [`users/u1/${NEW_ID}.png`, license.source].sort(),
    );
  });

  it('keeps the old media when the file is missing in TMP', async () => {
    storage.files.delete(tmpKey('u1'));

    await expect(replace()).resolves.toBeUndefined();

    expect(media.items.has(oldAvatar.id)).toBe(true);
    expect(media.items.has(NEW_ID)).toBe(false);
    expect(logger.entries).toEqual([
      expect.objectContaining({ level: 'warn', message: 'Media file skipped' }),
    ]);
  });

  it('keeps the old media for a TMP key of another user', async () => {
    storage.files.add(tmpKey('u2'));

    await replace({ key: tmpKey('u2') });

    expect(media.items.has(oldAvatar.id)).toBe(true);
    expect(media.items.has(NEW_ID)).toBe(false);
    expect(storage.files.has(tmpKey('u2'))).toBe(true);
  });

  it('keeps the old media for an invalid extension', async () => {
    await replace({ extension: 'exe' });

    expect(media.items.has(oldAvatar.id)).toBe(true);
    expect(media.items.has(NEW_ID)).toBe(false);
  });

  it('logs a storage delete failure of the old file and still records the new one', async () => {
    jest
      .spyOn(storage, 'deleteFile')
      .mockRejectedValueOnce(new Error('gcs down'));

    await expect(replace()).resolves.toBeUndefined();

    expect(media.items.has(NEW_ID)).toBe(true);
    expect(media.items.has(oldAvatar.id)).toBe(false);
    expect(logger.entries).toEqual([
      expect.objectContaining({
        level: 'error',
        message: 'Media file delete failed',
        meta: { mediaId: oldAvatar.id, source: oldAvatar.source },
      }),
    ]);
  });

  it('rethrows any other storage error without touching the old media', async () => {
    jest
      .spyOn(storage, 'moveFile')
      .mockRejectedValueOnce(new Error('gcs down'));

    await expect(replace()).rejects.toThrow('gcs down');

    expect(media.items.has(oldAvatar.id)).toBe(true);
    expect(media.items.has(NEW_ID)).toBe(false);
  });
});
