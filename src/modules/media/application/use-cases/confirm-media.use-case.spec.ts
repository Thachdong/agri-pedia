import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryLogger } from '@shared/logger';
import { InMemoryFileStorage } from '@shared/storage';
import { EMediaOwnerType, EMediaType } from '../../domain';
import { InMemoryMediaRepository } from '../ports/fakes';
import {
  ConfirmMediaUseCase,
  TConfirmMediaFile,
} from './confirm-media.use-case';

const tmpKey = (userId: string, n: number, ext: string) =>
  `tmp/${userId}/00000000-0000-4000-8000-00000000000${n}.${ext}`;

const file = (
  overrides: Partial<TConfirmMediaFile> = {},
): TConfirmMediaFile => ({
  key: tmpKey('u1', 1, 'png'),
  type: EMediaType.IMAGE,
  extension: 'png',
  filename: 'front.png',
  ...overrides,
});

describe('ConfirmMediaUseCase', () => {
  let media: InMemoryMediaRepository;
  let storage: InMemoryFileStorage;
  let logger: InMemoryLogger;
  let useCase: ConfirmMediaUseCase;

  const confirm = (files: TConfirmMediaFile[]) =>
    useCase.execute({
      uploaderId: 'u1',
      ownerType: EMediaOwnerType.PRODUCT,
      ownerId: 'p1',
      files,
    });

  beforeEach(() => {
    media = new InMemoryMediaRepository();
    storage = new InMemoryFileStorage();
    logger = new InMemoryLogger();
    useCase = new ConfirmMediaUseCase(
      media,
      storage,
      new InMemoryUnitOfWork(),
      logger,
    );
  });

  it('moves each TMP file to the owner folder and saves Media', async () => {
    storage.files.add(tmpKey('u1', 1, 'png'));
    storage.files.add(tmpKey('u1', 2, 'pdf'));

    await confirm([
      file({ sortOrder: 0 }),
      file({
        key: tmpKey('u1', 2, 'pdf'),
        type: EMediaType.FILE,
        extension: 'pdf',
        filename: 'spec.pdf',
      }),
    ]);

    const saved = [...media.items.values()];
    expect(saved).toHaveLength(2);
    expect(saved[0]).toMatchObject({
      ownerType: EMediaOwnerType.PRODUCT,
      ownerId: 'p1',
      extension: 'png',
      filename: 'front.png',
      sortOrder: 0,
    });
    expect([...storage.files].sort()).toEqual(
      saved.map((m) => m.source).sort(),
    );
    expect(saved.map((m) => m.source)).toEqual([
      `products/p1/${saved[0].id}.png`,
      `products/p1/${saved[1].id}.pdf`,
    ]);
  });

  it.each<[string, Partial<TConfirmMediaFile>]>([
    ['key of another user', { key: tmpKey('u2', 1, 'png') }],
    ['extension not allowed for type', { extension: 'exe' }],
    ['key extension differs from declared', { extension: 'jpg' }],
    ['file missing in TMP', { key: tmpKey('u1', 9, 'png') }],
  ])('skips and logs a bad file (%s), keeps the others', async (_, bad) => {
    storage.files.add(tmpKey('u1', 1, 'png'));
    storage.files.add(tmpKey('u2', 1, 'png'));

    await confirm([file(bad), file()]);

    expect(media.items.size).toBe(1);
    expect(logger.entries).toEqual([
      expect.objectContaining({
        level: 'warn',
        message: 'Media file skipped',
        meta: expect.objectContaining({ index: 0, ownerId: 'p1' }),
      }),
    ]);
  });

  it('saves moved files, then rethrows an unexpected storage error', async () => {
    storage.files.add(tmpKey('u1', 1, 'png'));
    storage.files.add(tmpKey('u1', 2, 'png'));
    const boom = new Error('network down');
    const moveFile = storage.moveFile.bind(storage);
    jest
      .spyOn(storage, 'moveFile')
      .mockImplementation(async (from, to) =>
        from === tmpKey('u1', 2, 'png')
          ? Promise.reject(boom)
          : moveFile(from, to),
      );

    await expect(
      confirm([file(), file({ key: tmpKey('u1', 2, 'png') })]),
    ).rejects.toBe(boom);
    expect(media.items.size).toBe(1);
  });
});
