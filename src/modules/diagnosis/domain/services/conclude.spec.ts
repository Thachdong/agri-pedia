import { TDiagnosisRegion, TImageDisease } from '../diagnosis-result.types';
import { EConfidenceLevel } from '../enums/confidence-level.enum';
import { EDiagnosisImageStatus } from '../enums/diagnosis-image-status.enum';
import { concludeImage, summarizeDiagnosis } from './conclude';

const { HIGH, MEDIUM } = EConfidenceLevel;

const region = (
  diseaseCode: string | null,
  confidence: TDiagnosisRegion['confidence'],
): TDiagnosisRegion => ({
  box: { x: 0, y: 0, w: 1, h: 1 },
  observations: {},
  descriptionEn: '',
  descriptionVi: '',
  candidates: [],
  verdict: diseaseCode
    ? {
        diseaseCode,
        variantCode: null,
        isLesion: true,
        selfConfidence: HIGH,
        features: [],
      }
    : null,
  confidence,
});

const disease = (
  diseaseCode: string,
  level: EConfidenceLevel,
  score: number,
): TImageDisease => ({
  diseaseCode,
  variantCode: null,
  confidence: { level, score },
});

describe('concludeImage', () => {
  it('is DISEASED with the best region per disease, best first', () => {
    expect(
      concludeImage([
        region('RICE_BLAST', { level: MEDIUM, score: 0.6 }),
        region('RICE_BLAST', { level: HIGH, score: 0.8 }),
        region('RICE_BROWN_SPOT', { level: MEDIUM, score: 0.7 }),
        region(null, null),
      ]),
    ).toEqual({
      status: EDiagnosisImageStatus.DISEASED,
      diseases: [
        disease('RICE_BLAST', HIGH, 0.8),
        disease('RICE_BROWN_SPOT', MEDIUM, 0.7),
      ],
    });
  });

  it('is UNCERTAIN with only uncertain regions, HEALTHY without regions', () => {
    expect(concludeImage([region('RICE_BLAST', null)])).toEqual({
      status: EDiagnosisImageStatus.UNCERTAIN,
      diseases: [],
    });
    expect(concludeImage([])).toEqual({
      status: EDiagnosisImageStatus.HEALTHY,
      diseases: [],
    });
  });
});

describe('summarizeDiagnosis', () => {
  it('merges diseases over images with the best confidence and image count', () => {
    expect(
      summarizeDiagnosis([
        { diseases: [disease('RICE_BLAST', MEDIUM, 0.6)] },
        { diseases: [disease('RICE_BLAST', HIGH, 0.85)] },
        { diseases: [] },
      ]),
    ).toEqual({
      hasDisease: true,
      conflict: false,
      diseases: [
        {
          diseaseCode: 'RICE_BLAST',
          confidence: { level: HIGH, score: 0.85 },
          imageCount: 2,
        },
      ],
    });
  });

  it('flags a conflict when different diseases are HIGH on different images', () => {
    const summary = summarizeDiagnosis([
      { diseases: [disease('RICE_BLAST', HIGH, 0.85)] },
      { diseases: [disease('RICE_BROWN_SPOT', HIGH, 0.8)] },
    ]);
    expect(summary.conflict).toBe(true);
    expect(summary.diseases.map((d) => d.diseaseCode)).toEqual([
      'RICE_BLAST',
      'RICE_BROWN_SPOT',
    ]);
  });

  it('has no disease and no conflict without diseases', () => {
    expect(summarizeDiagnosis([{ diseases: [] }])).toEqual({
      hasDisease: false,
      conflict: false,
      diseases: [],
    });
  });
});
