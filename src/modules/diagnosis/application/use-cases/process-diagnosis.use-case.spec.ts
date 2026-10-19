import {
  IKnowledgeQueryPort,
  TFindCandidatesInput,
} from '@modules/knowledge/contracts';
import { IConfigService } from '@shared/config';
import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryEventBus } from '@shared/event-bus';
import { InMemoryLogger } from '@shared/logger';
import { InMemoryRealtimePublisher } from '@shared/realtime';
import { InMemoryFileStorage } from '@shared/storage';
import {
  Diagnosis,
  EConfidenceLevel,
  EDiagnosisImageStatus,
  EDiagnosisStatus,
  EPlantPart,
  TDescribeResult,
} from '../../domain';
import {
  buildDiagnosisCrop,
  FakeImageProcessor,
  FakeVisionDiagnosisProvider,
  InMemoryDiagnosisRepository,
} from '../ports/fakes';
import { TProcessedImage } from '../ports/image-processor';
import {
  TDescribeOutput,
  TVerifyOutput,
} from '../ports/vision-diagnosis.provider';
import { ProcessDiagnosisUseCase } from './process-diagnosis.use-case';

const config = {
  get: () => ({ maxRegionsPerImage: 5, candidatesPerRegion: 3 }),
} as unknown as IConfigService;

const image = (content: string): TProcessedImage => ({
  data: Buffer.from(content),
  mimeType: 'image/jpeg',
  width: 1000,
  height: 800,
});

const spot = {
  box: { x: 0.3, y: 0.4, w: 0.1, h: 0.1 },
  observations: { lesionShape: 'SPINDLE_DIAMOND', centerColor: 'GRAY_WHITE' },
  descriptionEn: 'spindle lesion',
  descriptionVi: 'vết hình thoi',
};
const unknownSpot = {
  ...spot,
  box: { x: 0.6, y: 0.1, w: 0.1, h: 0.1 },
  observations: { lesionShape: 'TINY_DOTS' },
};

const described = (
  overrides: Partial<TDescribeResult> = {},
): TDescribeOutput => ({
  result: {
    isTargetCrop: 'YES',
    quality: 'GOOD',
    detectedPart: 'LEAF',
    wholeImage: { discoloration: 'NONE', plantForm: 'NORMAL' },
    regions: [spot],
    ...overrides,
  },
  raw: { b1: true },
});

const verified = (verdict = 'RICE_BLAST__V1'): TVerifyOutput => ({
  regions: [
    {
      regionIndex: 0,
      verdict,
      isLesion: true,
      supportingFeatures: ['vết hình thoi'],
      selfConfidence: EConfidenceLevel.HIGH,
    },
  ],
  raw: { b3: true },
});

class FailingUploadStorage extends InMemoryFileStorage {
  async uploadFile(): Promise<void> {
    throw new Error('bucket down');
  }
}

describe('ProcessDiagnosisUseCase', () => {
  let diagnoses: InMemoryDiagnosisRepository;
  let vision: FakeVisionDiagnosisProvider;
  let storage: InMemoryFileStorage;
  let realtime: InMemoryRealtimePublisher;
  let eventBus: InMemoryEventBus;
  let candidateRequests: TFindCandidatesInput[];
  let diagnosis: Diagnosis;
  let cropFound: boolean;

  const knowledgeQuery = {
    findDiagnosisCrop: async (code: string) =>
      cropFound ? buildDiagnosisCrop({ code }) : null,
    findCandidates: async (input: TFindCandidatesInput) => {
      candidateRequests.push(input);
      return input.regions.map((region) =>
        region.lesionShape === 'SPINDLE_DIAMOND'
          ? [
              {
                diseaseCode: 'RICE_BLAST',
                variantCode: 'RICE_BLAST__V1',
                matchScore: 0.9,
              },
              {
                diseaseCode: 'RICE_BROWN_SPOT',
                variantCode: null,
                matchScore: 0.08,
              },
            ]
          : [],
      );
    },
    getDiseaseCards: async (codes: string[]) =>
      codes.map((code) => ({
        code,
        name: code,
        symptoms: [],
        visualKeywords: [],
        distinguishFrom: [],
      })),
  } as unknown as IKnowledgeQueryPort;

  const useCase = (fileStorage: InMemoryFileStorage = storage) =>
    new ProcessDiagnosisUseCase(
      diagnoses,
      vision,
      new FakeImageProcessor(),
      knowledgeQuery,
      fileStorage,
      realtime,
      config,
      new InMemoryUnitOfWork(),
      eventBus,
      new InMemoryLogger(),
    );

  const run = (fileStorage?: InMemoryFileStorage) =>
    useCase(fileStorage).execute({
      diagnosisId: diagnosis.id,
      images: [image('a'), image('b')],
    });

  beforeEach(async () => {
    diagnoses = new InMemoryDiagnosisRepository();
    vision = new FakeVisionDiagnosisProvider();
    storage = new InMemoryFileStorage();
    realtime = new InMemoryRealtimePublisher();
    eventBus = new InMemoryEventBus();
    candidateRequests = [];
    cropFound = true;
    diagnosis = Diagnosis.create({
      userId: 'u1',
      cropType: 'RICE',
      note: null,
      provider: 'GEMINI',
      model: 'm',
      promptVersion: 'd1+v1',
      kbVersion: '2026-10-12',
      plantParts: [EPlantPart.LEAF, EPlantPart.PANICLE],
      maxImages: 5,
    });
    await diagnoses.save(diagnosis);
  });

  it('runs B1-B4 per image, stores the images, completes and notifies the owner', async () => {
    vision.onDescribe('a', described());
    vision.onVerify('a', verified());
    vision.onDescribe('b', described({ isTargetCrop: 'NO', regions: [] }));

    const result = await run();

    expect(result.status).toBe(EDiagnosisStatus.COMPLETED);
    const [first, second] = diagnosis.images;
    expect(first).toMatchObject({
      status: EDiagnosisImageStatus.DISEASED,
      detectedPart: EPlantPart.LEAF,
      b1Raw: { b1: true },
      b3Raw: { b3: true },
      diseases: [
        {
          diseaseCode: 'RICE_BLAST',
          variantCode: 'RICE_BLAST__V1',
          confidence: { level: EConfidenceLevel.HIGH, score: 0.9 },
        },
      ],
    });
    expect(first.regions).toEqual([
      expect.objectContaining({
        box: spot.box,
        descriptionVi: 'vết hình thoi',
        candidates: [
          {
            diseaseCode: 'RICE_BLAST',
            variantCode: 'RICE_BLAST__V1',
            matchScore: 0.9,
          },
          {
            diseaseCode: 'RICE_BROWN_SPOT',
            variantCode: null,
            matchScore: 0.08,
          },
        ],
        verdict: expect.objectContaining({ diseaseCode: 'RICE_BLAST' }),
      }),
    ]);
    expect(second.status).toBe(EDiagnosisImageStatus.NOT_TARGET_CROP);
    expect(diagnosis.summary?.hasDisease).toBe(true);

    // B2 used the detected part and the whole-image observations
    expect(candidateRequests[0]).toMatchObject({
      cropType: 'RICE',
      part: 'LEAF',
      wholeImage: { discoloration: 'NONE' },
      limit: 3,
    });
    // B1 and B3 got the crop configuration
    expect(vision.describeRequests[0]).toMatchObject({
      crop: { code: 'RICE' },
      plantPart: EPlantPart.LEAF,
      maxRegions: 5,
    });
    expect(vision.verifyRequests[0].crop.code).toBe('RICE');
    // B3 got the thumbnail, the crop and the cards
    expect(vision.verifyRequests[0].thumbnail.data.toString()).toBe('thumb:a');
    expect(vision.verifyRequests[0].regions[0]).toMatchObject({
      regionIndex: 0,
      candidateCodes: ['RICE_BLAST__V1', 'RICE_BROWN_SPOT'],
    });
    expect(vision.verifyRequests[0].cards.map((c) => c.code)).toEqual([
      'RICE_BLAST__V1',
      'RICE_BROWN_SPOT',
    ]);

    expect(result.storedFiles.map((f) => f.sortOrder)).toEqual([0, 1]);
    expect(diagnosis.images.map((i) => i.mediaId)).toEqual(
      result.storedFiles.map((f) => f.mediaId),
    );
    expect([...storage.files]).toEqual(result.storedFiles.map((f) => f.key));
    expect(result.storedFiles[0].key).toBe(
      `diagnoses/${diagnosis.id}/${result.storedFiles[0].mediaId}.jpg`,
    );
    expect(realtime.emitted).toEqual([
      {
        userId: 'u1',
        event: 'diagnosis.completed',
        payload: { id: diagnosis.id, status: EDiagnosisStatus.COMPLETED },
      },
    ]);
    expect(eventBus.published).toEqual([
      expect.objectContaining({
        name: 'diagnosis.images.stored',
        payload: {
          diagnosisId: diagnosis.id,
          userId: 'u1',
          files: result.storedFiles.map((file) => ({
            mediaId: file.mediaId,
            key: file.key,
            extension: 'jpg',
            filename: `image-${file.sortOrder + 1}.jpg`,
            sortOrder: file.sortOrder,
          })),
        },
      }),
    ]);
  });

  it('retries a failed AI step once', async () => {
    vision.onDescribe('a', new Error('timeout'), described());
    vision.onVerify('a', new Error('bad json'), verified());
    vision.onDescribe('b', described({ regions: [] }));

    await run();

    expect(vision.describeRequests).toHaveLength(3);
    expect(diagnosis.images[0].status).toBe(EDiagnosisImageStatus.DISEASED);
    expect(diagnosis.images[1].status).toBe(EDiagnosisImageStatus.HEALTHY);
  });

  it('marks an image UNCERTAIN when verify fails twice, keeping its candidates', async () => {
    vision.onDescribe('a', described());
    vision.onVerify('a', new Error('x'), new Error('y'));
    vision.onDescribe('b', described({ regions: [] }));

    const result = await run();

    expect(result.status).toBe(EDiagnosisStatus.COMPLETED);
    expect(diagnosis.images[0].status).toBe(EDiagnosisImageStatus.UNCERTAIN);
    expect(diagnosis.images[0].regions[0]).toMatchObject({
      verdict: null,
      confidence: null,
    });
    expect(diagnosis.images[0].regions[0].candidates).toHaveLength(2);
  });

  it('ignores a detected part that is not a part of the crop, scoring on the user hint', async () => {
    vision.onDescribe('a', described({ detectedPart: 'FRUIT', regions: [] }));
    vision.onDescribe('b', described({ regions: [] }));

    await run();

    expect(diagnosis.images[0].detectedPart).toBeNull();
    expect(diagnosis.images[1].detectedPart).toBe(EPlantPart.LEAF);
  });

  it("adds a whole-image region from the crop's features when the whole image looks abnormal", async () => {
    vision.onDescribe(
      'a',
      described({ regions: [], wholeImage: { plantForm: 'STUNTED' } }),
    );
    vision.onDescribe('b', described({ regions: [] }));

    await run();

    expect(candidateRequests).toHaveLength(1);
    expect(candidateRequests[0]).toMatchObject({
      part: 'LEAF',
      wholeImage: { plantForm: 'STUNTED' },
      regions: [
        { lesionShape: 'NO_DISTINCT_LESION', distribution: 'WHOLE_ORGAN' },
      ],
    });
    expect(diagnosis.images[0].status).toBe(EDiagnosisImageStatus.UNCERTAIN);
    expect(diagnosis.images[1].status).toBe(EDiagnosisImageStatus.HEALTHY);
  });

  it('fails the diagnosis without calling the AI when the crop is gone', async () => {
    cropFound = false;

    const result = await run();

    expect(result.status).toBe(EDiagnosisStatus.FAILED);
    expect(diagnosis.failureReason).toBe('Crop RICE not found');
    expect(vision.describeRequests).toHaveLength(0);
    expect(realtime.emitted[0].payload).toEqual({
      id: diagnosis.id,
      status: EDiagnosisStatus.FAILED,
    });
  });

  it('fails the diagnosis when every image fails at the AI', async () => {
    vision.onDescribe('a', new Error('1'), new Error('2'));
    vision.onDescribe('b', new Error('1'), new Error('2'));

    const result = await run();

    expect(result.status).toBe(EDiagnosisStatus.FAILED);
    expect(diagnosis.failureReason).toBe(
      'Every image failed at the AI provider',
    );
    expect(realtime.emitted[0].payload).toEqual({
      id: diagnosis.id,
      status: EDiagnosisStatus.FAILED,
    });
  });

  it('keeps regions without candidates as UNCERTAIN without calling verify', async () => {
    vision.onDescribe('a', described({ regions: [unknownSpot] }));
    vision.onDescribe('b', described({ regions: [] }));

    await run();

    expect(vision.verifyRequests).toHaveLength(0);
    expect(diagnosis.images[0].status).toBe(EDiagnosisImageStatus.UNCERTAIN);
    expect(diagnosis.images[0].regions[0]).toMatchObject({
      candidates: [],
      verdict: null,
      confidence: null,
    });
  });

  it('drops regions the verify step rejects', async () => {
    vision.onDescribe('a', described({ regions: [spot, unknownSpot] }));
    vision.onVerify('a', verified('NONE'));
    vision.onDescribe('b', described({ regions: [] }));

    await run();

    expect(diagnosis.images[0].regions).toHaveLength(1);
    expect(diagnosis.images[0].regions[0].candidates).toEqual([]);
    expect(diagnosis.images[0].status).toBe(EDiagnosisImageStatus.UNCERTAIN);
  });

  it('completes without media when uploads fail', async () => {
    vision.onDescribe('a', described({ regions: [] }));
    vision.onDescribe('b', described({ regions: [] }));

    const result = await run(new FailingUploadStorage());

    expect(result.status).toBe(EDiagnosisStatus.COMPLETED);
    expect(result.storedFiles).toEqual([]);
    expect(diagnosis.images.map((i) => i.mediaId)).toEqual([null, null]);
    expect(eventBus.published).toEqual([]);
  });

  it('skips a diagnosis that is no longer processing', async () => {
    diagnosis.fail('stale');

    const result = await run();

    expect(result).toEqual({ status: null, storedFiles: [] });
    expect(vision.describeRequests).toHaveLength(0);
    expect(realtime.emitted).toHaveLength(0);
    expect(eventBus.published).toEqual([]);
  });
});
