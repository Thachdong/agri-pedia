import { TRegionCandidate } from '../diagnosis-result.types';
import { EConfidenceLevel } from '../enums/confidence-level.enum';
import {
  assessRegion,
  diseaseCodeOf,
  TVerifyRegionResult,
} from './assess-region';

const blast: TRegionCandidate = {
  diseaseCode: 'RICE_BLAST',
  variantCode: 'RICE_BLAST__V1',
  matchScore: 0.8,
};
const brownSpot: TRegionCandidate = {
  diseaseCode: 'RICE_BROWN_SPOT',
  variantCode: null,
  matchScore: 0.15,
};

const verify = (
  overrides: Partial<TVerifyRegionResult> = {},
): TVerifyRegionResult => ({
  verdict: 'RICE_BLAST__V1',
  isLesion: true,
  supportingFeatures: ['vết hình thoi'],
  selfConfidence: EConfidenceLevel.HIGH,
  ...overrides,
});

describe('diseaseCodeOf', () => {
  it('strips the variant suffix', () => {
    expect(diseaseCodeOf('RICE_BLAST__V2')).toBe('RICE_BLAST');
    expect(diseaseCodeOf('RICE_BROWN_SPOT')).toBe('RICE_BROWN_SPOT');
  });
});

describe('assessRegion', () => {
  it('is HIGH when top-1 matches well and the verify step agrees confidently', () => {
    expect(assessRegion([blast, brownSpot], verify())).toEqual({
      verdict: {
        diseaseCode: 'RICE_BLAST',
        variantCode: 'RICE_BLAST__V1',
        isLesion: true,
        selfConfidence: EConfidenceLevel.HIGH,
        features: ['vết hình thoi'],
      },
      confidence: { level: EConfidenceLevel.HIGH, score: 0.85 },
    });
  });

  it('is MEDIUM when the verify step is LOW or the match score is under the threshold', () => {
    expect(
      assessRegion([blast], verify({ selfConfidence: EConfidenceLevel.LOW }))
        ?.confidence,
    ).toEqual({ level: EConfidenceLevel.MEDIUM, score: 0.55 });
    expect(
      assessRegion([{ ...blast, matchScore: 0.4 }], verify())?.confidence
        ?.level,
    ).toBe(EConfidenceLevel.MEDIUM);
  });

  it('is UNCERTAIN (no confidence) when the verify step picks another candidate', () => {
    const result = assessRegion(
      [blast, brownSpot],
      verify({ verdict: 'RICE_BROWN_SPOT' }),
    );
    expect(result?.confidence).toBeNull();
    expect(result?.verdict?.diseaseCode).toBe('RICE_BROWN_SPOT');
  });

  it('keeps a region without candidates as UNCERTAIN', () => {
    expect(assessRegion([], null)).toEqual({ verdict: null, confidence: null });
  });

  it('drops the region for NONE, not a lesion, an unknown code or a missing answer', () => {
    expect(assessRegion([blast], verify({ verdict: 'NONE' }))).toBeNull();
    expect(assessRegion([blast], verify({ isLesion: false }))).toBeNull();
    expect(
      assessRegion([blast], verify({ verdict: 'RICE_TUNGRO' })),
    ).toBeNull();
    expect(assessRegion([blast], null)).toBeNull();
  });
});
