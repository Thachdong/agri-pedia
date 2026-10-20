import { EConfidenceLevel } from '../enums/confidence-level.enum';
import { EDiagnosisFeedback } from '../enums/diagnosis-feedback.enum';
import { EDiagnosisImageStatus } from '../enums/diagnosis-image-status.enum';
import { EDiagnosisStatus } from '../enums/diagnosis-status.enum';
import { EPlantPart } from '../enums/plant-part.enum';
import { DiagnosisInvalidImageException } from '../exceptions/diagnosis-invalid-image.exception';
import { DiagnosisNotCompletedException } from '../exceptions/diagnosis-not-completed.exception';
import { DiagnosisNotProcessingException } from '../exceptions/diagnosis-not-processing.exception';
import { Diagnosis, TCreateDiagnosisProps } from './diagnosis.entity';

const create = (overrides: Partial<TCreateDiagnosisProps> = {}) =>
  Diagnosis.create({
    userId: 'u1',
    cropType: 'RICE',
    note: null,
    provider: 'GEMINI',
    model: 'm-describe+m-verify',
    promptVersion: 'd1+v1',
    kbVersion: '2026-10-12',
    plantParts: [EPlantPart.LEAF, EPlantPart.PANICLE],
    maxImages: 5,
    ...overrides,
  });

const diseased = {
  detectedPart: EPlantPart.LEAF,
  status: EDiagnosisImageStatus.DISEASED,
  diseases: [
    {
      diseaseCode: 'RICE_BLAST',
      variantCode: 'RICE_BLAST__V1',
      confidence: { level: EConfidenceLevel.HIGH, score: 0.85 },
    },
  ],
  regions: [],
  b1Raw: { b: 1 },
  b3Raw: { b: 3 },
};

describe('Diagnosis.create', () => {
  it('starts PROCESSING with one pending image per plant part, in order', () => {
    const diagnosis = create();

    expect(diagnosis.status).toBe(EDiagnosisStatus.PROCESSING);
    expect(diagnosis.summary).toBeNull();
    expect(
      diagnosis.images.map((i) => [
        i.sortOrder,
        i.plantPart,
        i.status,
        i.mediaId,
      ]),
    ).toEqual([
      [0, EPlantPart.LEAF, null, null],
      [1, EPlantPart.PANICLE, null, null],
    ]);
  });

  it('rejects 0 or more than maxImages images', () => {
    expect(() => create({ plantParts: [] })).toThrow(
      DiagnosisInvalidImageException,
    );
    expect(() =>
      create({ plantParts: Array(3).fill(EPlantPart.LEAF), maxImages: 2 }),
    ).toThrow(DiagnosisInvalidImageException);
    expect(
      create({ plantParts: Array(2).fill(EPlantPart.LEAF), maxImages: 2 })
        .images,
    ).toHaveLength(2);
  });
});

describe('Diagnosis processing', () => {
  it('records image results and media, then completes with a summary', () => {
    const diagnosis = create();
    diagnosis.recordImageResult(0, diseased);
    diagnosis.recordImageResult(1, {
      ...diseased,
      status: EDiagnosisImageStatus.HEALTHY,
      diseases: [],
    });
    diagnosis.attachImageMedia(0, 'm0');
    const now = new Date('2026-10-13T00:00:00Z');

    diagnosis.complete(now);

    expect(diagnosis.status).toBe(EDiagnosisStatus.COMPLETED);
    expect(diagnosis.completedAt).toBe(now);
    expect(diagnosis.images[0]).toMatchObject({
      mediaId: 'm0',
      status: EDiagnosisImageStatus.DISEASED,
      b1Raw: { b: 1 },
    });
    expect(diagnosis.summary).toEqual({
      hasDisease: true,
      conflict: false,
      diseases: [
        {
          diseaseCode: 'RICE_BLAST',
          confidence: { level: EConfidenceLevel.HIGH, score: 0.85 },
          imageCount: 1,
        },
      ],
    });
  });

  it('fails with a reason', () => {
    const diagnosis = create();
    diagnosis.fail('all images failed');

    expect(diagnosis.status).toBe(EDiagnosisStatus.FAILED);
    expect(diagnosis.failureReason).toBe('all images failed');
    expect(diagnosis.completedAt).toBeInstanceOf(Date);
  });

  it('refuses changes once finished', () => {
    const diagnosis = create();
    diagnosis.fail('timeout');

    expect(() => diagnosis.complete()).toThrow(DiagnosisNotProcessingException);
    expect(() => diagnosis.fail('again')).toThrow(
      DiagnosisNotProcessingException,
    );
    expect(() => diagnosis.recordImageResult(0, diseased)).toThrow(
      DiagnosisNotProcessingException,
    );
    expect(() => diagnosis.attachImageMedia(0, 'm0')).toThrow(
      DiagnosisNotProcessingException,
    );
  });
});

describe('Diagnosis.giveFeedback', () => {
  it('sets and overwrites feedback on a completed diagnosis', () => {
    const diagnosis = create();
    diagnosis.complete();

    diagnosis.giveFeedback(EDiagnosisFeedback.WRONG, 'không đúng');
    diagnosis.giveFeedback(EDiagnosisFeedback.CORRECT, null);

    expect(diagnosis.userFeedback).toBe(EDiagnosisFeedback.CORRECT);
    expect(diagnosis.feedbackComment).toBeNull();
  });

  it('rejects feedback before completion', () => {
    expect(() =>
      create().giveFeedback(EDiagnosisFeedback.CORRECT, null),
    ).toThrow(DiagnosisNotCompletedException);
  });
});
