import { IKnowledgeQueryPort } from '@modules/knowledge/contracts';
import { IUserQueryPort } from '@modules/user/contracts';
import { InMemoryUnitOfWork } from '@shared/database';
import {
  DiagnosisCropNotSupportedException,
  DiagnosisDailyLimitExceededException,
  DiagnosisInvalidImageException,
  DiagnosisUserNotAllowedException,
  EDiagnosisStatus,
  EPlantPart,
} from '../../domain';
import {
  buildDiagnosisCrop,
  FakeImageProcessor,
  FakeVisionDiagnosisProvider,
  InMemoryDiagnosisJobRunner,
  InMemoryDiagnosisRepository,
  InMemoryDiagnosisSettingsRepository,
} from '../ports/fakes';
import {
  CreateDiagnosisUseCase,
  startOfLocalDay,
  TCreateDiagnosisInput,
} from './create-diagnosis.use-case';

describe('startOfLocalDay', () => {
  it('is local (UTC+7) midnight', () => {
    expect(
      startOfLocalDay(new Date('2026-10-13T16:59:00Z')).toISOString(),
    ).toBe('2026-10-12T17:00:00.000Z');
    expect(
      startOfLocalDay(new Date('2026-10-13T17:00:00Z')).toISOString(),
    ).toBe('2026-10-13T17:00:00.000Z');
  });
});

describe('CreateDiagnosisUseCase', () => {
  let diagnoses: InMemoryDiagnosisRepository;
  let settings: InMemoryDiagnosisSettingsRepository;
  let jobs: InMemoryDiagnosisJobRunner;
  let userActive: boolean | null;
  let crop: { enabled: boolean } | null;
  let useCase: CreateDiagnosisUseCase;

  const input = (
    overrides: Partial<TCreateDiagnosisInput> = {},
  ): TCreateDiagnosisInput => ({
    userId: 'u1',
    cropType: 'RICE',
    note: 'lá vàng',
    files: [Buffer.from('img-a'), Buffer.from('img-b')],
    plantParts: [EPlantPart.LEAF, EPlantPart.PANICLE],
    ...overrides,
  });

  beforeEach(() => {
    diagnoses = new InMemoryDiagnosisRepository();
    settings = new InMemoryDiagnosisSettingsRepository();
    settings.saved = {
      dailyFreeLimit: 2,
      defaultCropType: null,
      maxImages: 3,
      maxImageBytes: 20,
      maxImageWidth: 2000,
      maxImageHeight: 1500,
    };
    jobs = new InMemoryDiagnosisJobRunner();
    userActive = true;
    crop = { enabled: true };
    const userQuery = {
      findRoleById: async (userId: string) =>
        userActive === null
          ? null
          : { userId, role: 'FARMER', isActive: userActive },
    } as unknown as IUserQueryPort;
    const knowledgeQuery = {
      findDiagnosisCrop: async (code: string) =>
        crop ? buildDiagnosisCrop({ code, enabled: crop.enabled }) : null,
    } as unknown as IKnowledgeQueryPort;
    useCase = new CreateDiagnosisUseCase(
      diagnoses,
      settings,
      new FakeImageProcessor(),
      new FakeVisionDiagnosisProvider(),
      jobs,
      userQuery,
      knowledgeQuery,
      new InMemoryUnitOfWork(),
    );
  });

  it('records a PROCESSING diagnosis and starts the job with the normalized images', async () => {
    const result = await useCase.execute(input());

    expect(result.status).toBe(EDiagnosisStatus.PROCESSING);
    const saved = diagnoses.items.get(result.id);
    expect(saved).toMatchObject({
      userId: 'u1',
      cropType: 'RICE',
      note: 'lá vàng',
      provider: 'GEMINI',
      model: 'describe-model+verify-model',
      promptVersion: 'd+v/RICE@2026-10-12',
      kbVersion: '2026-10-12',
    });
    expect(saved?.images.map((i) => i.plantPart)).toEqual([
      EPlantPart.LEAF,
      EPlantPart.PANICLE,
    ]);
    expect(jobs.jobs).toHaveLength(1);
    expect(jobs.jobs[0].diagnosisId).toBe(result.id);
    expect(jobs.jobs[0].images.map((i) => i.data.toString())).toEqual([
      'jpeg:img-a',
      'jpeg:img-b',
    ]);
  });

  it('rejects a user who is not active or unknown', async () => {
    userActive = false;
    await expect(useCase.execute(input())).rejects.toBeInstanceOf(
      DiagnosisUserNotAllowedException,
    );
    userActive = null;
    await expect(useCase.execute(input())).rejects.toBeInstanceOf(
      DiagnosisUserNotAllowedException,
    );
  });

  it('rejects an unknown or disabled crop', async () => {
    crop = { enabled: false };
    await expect(useCase.execute(input())).rejects.toBeInstanceOf(
      DiagnosisCropNotSupportedException,
    );
    crop = null;
    await expect(useCase.execute(input())).rejects.toBeInstanceOf(
      DiagnosisCropNotSupportedException,
    );
  });

  it('rejects a wrong number of files or plant parts', async () => {
    await expect(
      useCase.execute(input({ files: [], plantParts: [] })),
    ).rejects.toBeInstanceOf(DiagnosisInvalidImageException);
    await expect(
      useCase.execute(input({ plantParts: [EPlantPart.LEAF] })),
    ).rejects.toBeInstanceOf(DiagnosisInvalidImageException);
  });

  it('rejects plant parts that are not parts of the crop, by index', async () => {
    const error = await useCase
      .execute(input({ plantParts: [EPlantPart.LEAF, EPlantPart.FRUIT] }))
      .catch((e) => e);

    expect(error).toBeInstanceOf(DiagnosisInvalidImageException);
    expect(error.details.images).toEqual([
      { index: 1, reason: 'plantPart FRUIT is not a part of crop RICE' },
    ]);
    expect(jobs.jobs).toHaveLength(0);
  });

  it('reports too large and unreadable images by index', async () => {
    const tooLarge = await useCase
      .execute(input({ files: [Buffer.from('ok'), Buffer.alloc(21)] }))
      .catch((e) => e);
    expect(tooLarge).toBeInstanceOf(DiagnosisInvalidImageException);
    expect(tooLarge.details.images).toEqual([
      { index: 1, reason: 'Larger than 20 bytes' },
    ]);

    const unreadable = await useCase
      .execute(input({ files: [Buffer.from('bad'), Buffer.from('ok')] }))
      .catch((e) => e);
    expect(unreadable.details.images).toEqual([
      { index: 0, reason: 'Unsupported image format' },
    ]);
    expect(jobs.jobs).toHaveLength(0);
  });

  it('rejects more images than the max images setting', async () => {
    const error = await useCase
      .execute(
        input({
          files: Array(4).fill(Buffer.from('ok')),
          plantParts: Array(4).fill(EPlantPart.LEAF),
        }),
      )
      .catch((e) => e);

    expect(error).toBeInstanceOf(DiagnosisInvalidImageException);
    expect(error.details.images).toEqual([
      { index: null, reason: 'Expected 1..3 images, got 4' },
    ]);
  });

  it('reports images larger than the max pixel size by index', async () => {
    const error = await useCase
      .execute(input({ files: [Buffer.from('2000x1501'), Buffer.from('ok')] }))
      .catch((e) => e);

    expect(error).toBeInstanceOf(DiagnosisInvalidImageException);
    expect(error.details.images).toEqual([
      {
        index: 0,
        reason: '2000x1501 px is larger than 2000x1500 px',
      },
    ]);
    expect(jobs.jobs).toHaveLength(0);
  });

  it('uses the default settings when none were saved', async () => {
    settings.saved = null;
    for (let i = 0; i < 3; i++) await useCase.execute(input());

    await expect(useCase.execute(input())).rejects.toBeInstanceOf(
      DiagnosisDailyLimitExceededException,
    );
  });

  it('rejects past the daily limit', async () => {
    await useCase.execute(input());
    await useCase.execute(input());

    await expect(useCase.execute(input())).rejects.toBeInstanceOf(
      DiagnosisDailyLimitExceededException,
    );
    expect(diagnoses.items.size).toBe(2);
  });
});
