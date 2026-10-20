import { IConfigService } from '@shared/config';
import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryLogger } from '@shared/logger';
import { InMemoryFileStorage } from '@shared/storage';
import { ELabelSource, TrainingSample } from '../../domain';
import {
  FakeImageQualityInspector,
  InMemoryTrainingSampleRepository,
} from '../ports/fakes';
import {
  CollectTrainingSamplesUseCase,
  TCollectTrainingImage,
  TCollectTrainingSamplesInput,
} from './collect-training-samples.use-case';

const config = {
  get: () => ({
    minShortSidePx: 512,
    minSharpness: 0.8,
    minBrightness: 40,
    maxBrightness: 220,
  }),
} as unknown as IConfigService;

const box = { x: 0.1, y: 0.2, w: 0.3, h: 0.4 };

const image = (
  overrides: Partial<TCollectTrainingImage> = {},
): TCollectTrainingImage => ({
  sortOrder: 0,
  key: 'diagnoses/d1/m0.jpg',
  plantPart: 'LEAF',
  detectedPart: null,
  diseases: [
    { diseaseCode: 'RICE_BLAST', variantCode: 'V1', level: 'HIGH', score: 0.9 },
  ],
  regions: [{ box, diseaseCode: 'RICE_BLAST', level: 'HIGH', score: 0.9 }],
  ...overrides,
});

const input = (
  overrides: Partial<TCollectTrainingSamplesInput> = {},
): TCollectTrainingSamplesInput => ({
  diagnosisId: 'd1',
  cropType: 'RICE',
  provider: 'GEMINI',
  model: 'm',
  promptVersion: 'p',
  kbVersion: 'k',
  conflict: false,
  images: [image()],
  ...overrides,
});

describe('CollectTrainingSamplesUseCase', () => {
  let samples: InMemoryTrainingSampleRepository;
  let inspector: FakeImageQualityInspector;
  let storage: InMemoryFileStorage;
  let logger: InMemoryLogger;
  let useCase: CollectTrainingSamplesUseCase;

  beforeEach(async () => {
    samples = new InMemoryTrainingSampleRepository();
    inspector = new FakeImageQualityInspector();
    storage = new InMemoryFileStorage();
    logger = new InMemoryLogger();
    useCase = new CollectTrainingSamplesUseCase(
      samples,
      inspector,
      storage,
      config,
      new InMemoryUnitOfWork(),
      logger,
    );
    for (const key of ['diagnoses/d1/m0.jpg', 'diagnoses/d1/m1.jpg']) {
      await storage.uploadFile(key, Buffer.from(key), 'image/jpeg');
    }
  });

  it('saves a sample for a selected image and copies it to the dataset key', async () => {
    const { sampleIds } = await useCase.execute(
      input({ images: [image({ detectedPart: 'STEM' })] }),
    );

    expect(sampleIds).toHaveLength(1);
    const sample = samples.items.get(sampleIds[0]) as TrainingSample;
    expect(sample).toMatchObject({
      diagnosisId: 'd1',
      sortOrder: 0,
      cropType: 'RICE',
      plantPart: 'STEM',
      diseaseCode: 'RICE_BLAST',
      variantCode: 'V1',
      confidenceScore: 0.9,
      regions: [{ box, score: 0.9 }],
      labelSource: ELabelSource.AI_HIGH,
      model: 'm',
    });
    await expect(storage.downloadFile(sample.imageKey)).resolves.toEqual(
      Buffer.from('diagnoses/d1/m0.jpg'),
    );
    expect(storage.files.has('diagnoses/d1/m0.jpg')).toBe(true);
  });

  it('falls back to the user plant part when the AI did not recognize it', async () => {
    const { sampleIds } = await useCase.execute(input());

    expect(samples.items.get(sampleIds[0])?.plantPart).toBe('LEAF');
  });

  it('skips images the selection rule drops', async () => {
    const { sampleIds } = await useCase.execute(input({ conflict: true }));

    expect(sampleIds).toEqual([]);
    expect(samples.items.size).toBe(0);
  });

  it('skips an image already kept', async () => {
    await useCase.execute(input());

    const { sampleIds } = await useCase.execute(input());

    expect(sampleIds).toEqual([]);
    expect(samples.items.size).toBe(1);
  });

  it.each([
    [{ width: 400, height: 2048 }, 'TOO_SMALL'],
    [{ sharpness: 0.5 }, 'BLURRY'],
    [{ brightness: 20 }, 'TOO_DARK'],
    [{ brightness: 240 }, 'TOO_BRIGHT'],
  ])(
    'rejects an image failing the quality gate (%o)',
    async (quality, rejection) => {
      inspector.quality = { ...inspector.quality, ...quality };

      const { sampleIds } = await useCase.execute(input());

      expect(sampleIds).toEqual([]);
      expect([...storage.files].some((k) => k.startsWith('datasets/'))).toBe(
        false,
      );
      expect(logger.entries).toContainEqual(
        expect.objectContaining({
          level: 'info',
          meta: expect.objectContaining({ rejection }),
        }),
      );
    },
  );

  it('logs a failing image and goes on with the next one', async () => {
    const { sampleIds } = await useCase.execute(
      input({
        images: [
          image({ key: 'diagnoses/d1/missing.jpg' }),
          image({ sortOrder: 1, key: 'diagnoses/d1/m1.jpg' }),
        ],
      }),
    );

    expect(sampleIds).toHaveLength(1);
    expect(samples.items.get(sampleIds[0])?.sortOrder).toBe(1);
    expect(logger.entries).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        message: 'Training sample dropped',
        meta: expect.objectContaining({ sortOrder: 0 }),
      }),
    );
  });

  it('drops the image when it cannot be inspected', async () => {
    inspector.fail = true;

    await expect(useCase.execute(input())).resolves.toEqual({ sampleIds: [] });
  });
});
