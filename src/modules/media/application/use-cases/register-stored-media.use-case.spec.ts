import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryLogger } from '@shared/logger';
import { EMediaOwnerType, EMediaType } from '../../domain';
import { InMemoryMediaRepository } from '../ports/fakes';
import {
  RegisterStoredMediaUseCase,
  TRegisterStoredMediaFile,
} from './register-stored-media.use-case';

const file = (
  mediaId: string,
  overrides: Partial<TRegisterStoredMediaFile> = {},
): TRegisterStoredMediaFile => ({
  mediaId,
  key: `diagnoses/d1/${mediaId}.jpg`,
  type: EMediaType.IMAGE,
  extension: 'jpg',
  filename: `${mediaId}.jpg`,
  ...overrides,
});

describe('RegisterStoredMediaUseCase', () => {
  let media: InMemoryMediaRepository;
  let logger: InMemoryLogger;
  let useCase: RegisterStoredMediaUseCase;

  const register = (files: TRegisterStoredMediaFile[]) =>
    useCase.execute({
      ownerType: EMediaOwnerType.DIAGNOSIS,
      ownerId: 'd1',
      files,
    });

  beforeEach(() => {
    media = new InMemoryMediaRepository();
    logger = new InMemoryLogger();
    useCase = new RegisterStoredMediaUseCase(
      media,
      new InMemoryUnitOfWork(),
      logger,
    );
  });

  it('records each stored file with its own id, key and sort order', async () => {
    await register([
      file('m1', { sortOrder: 0 }),
      file('m2', { sortOrder: 1 }),
    ]);

    expect(
      [...media.items.values()].map((m) => [
        m.id,
        m.source,
        m.ownerType,
        m.ownerId,
        m.sortOrder,
      ]),
    ).toEqual([
      ['m1', 'diagnoses/d1/m1.jpg', 'DIAGNOSIS', 'd1', 0],
      ['m2', 'diagnoses/d1/m2.jpg', 'DIAGNOSIS', 'd1', 1],
    ]);
  });

  it('is idempotent when the same files are registered again', async () => {
    await register([file('m1')]);
    await register([file('m1'), file('m2')]);

    expect([...media.items.keys()]).toEqual(['m1', 'm2']);
  });

  it('skips and logs files whose key or extension does not fit the owner layout', async () => {
    await register([
      file('m1', { key: 'diagnoses/other/m1.jpg' }),
      file('m2', { extension: 'exe' }),
      file('m3'),
    ]);

    expect([...media.items.keys()]).toEqual(['m3']);
    expect(
      logger.entries.filter((e) => e.message === 'Stored media file skipped'),
    ).toHaveLength(2);
  });
});
