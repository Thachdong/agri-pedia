import {
  TConfidence,
  TDiagnosisRegion,
  TDiagnosisSummary,
  TImageDisease,
} from '../diagnosis-result.types';
import { EConfidenceLevel } from '../enums/confidence-level.enum';
import { EDiagnosisImageStatus } from '../enums/diagnosis-image-status.enum';

const LEVEL_RANK: Record<EConfidenceLevel, number> = {
  [EConfidenceLevel.HIGH]: 3,
  [EConfidenceLevel.MEDIUM]: 2,
  [EConfidenceLevel.LOW]: 1,
};

/** Higher level wins, then higher score. */
export function compareConfidence(a: TConfidence, b: TConfidence): number {
  return LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || a.score - b.score;
}

/**
 * B4 for one image from its kept regions: a confident region -> DISEASED (best region per disease);
 * only UNCERTAIN regions -> UNCERTAIN; no region -> HEALTHY.
 */
export function concludeImage(regions: TDiagnosisRegion[]): {
  status: EDiagnosisImageStatus;
  diseases: TImageDisease[];
} {
  const best = new Map<string, TImageDisease>();
  for (const region of regions) {
    if (!region.confidence || !region.verdict) continue;
    const current = best.get(region.verdict.diseaseCode);
    if (
      current &&
      compareConfidence(current.confidence, region.confidence) >= 0
    ) {
      continue;
    }
    best.set(region.verdict.diseaseCode, {
      diseaseCode: region.verdict.diseaseCode,
      variantCode: region.verdict.variantCode,
      confidence: region.confidence,
    });
  }
  const diseases = [...best.values()].sort((a, b) =>
    compareConfidence(b.confidence, a.confidence),
  );
  if (diseases.length > 0) {
    return { status: EDiagnosisImageStatus.DISEASED, diseases };
  }
  return {
    status:
      regions.length > 0
        ? EDiagnosisImageStatus.UNCERTAIN
        : EDiagnosisImageStatus.HEALTHY,
    diseases: [],
  };
}

/** Whole case: diseases merged by code (best confidence, number of images), conflict when two differ at HIGH. */
export function summarizeDiagnosis(
  images: Array<{ diseases: TImageDisease[] }>,
): TDiagnosisSummary {
  const merged = new Map<
    string,
    { diseaseCode: string; confidence: TConfidence; imageCount: number }
  >();
  for (const image of images) {
    for (const disease of image.diseases) {
      const current = merged.get(disease.diseaseCode);
      if (!current) {
        merged.set(disease.diseaseCode, {
          diseaseCode: disease.diseaseCode,
          confidence: disease.confidence,
          imageCount: 1,
        });
        continue;
      }
      current.imageCount += 1;
      if (compareConfidence(disease.confidence, current.confidence) > 0) {
        current.confidence = disease.confidence;
      }
    }
  }
  const diseases = [...merged.values()].sort((a, b) =>
    compareConfidence(b.confidence, a.confidence),
  );
  const highOnImages = images.map(
    (image) =>
      new Set(
        image.diseases
          .filter((d) => d.confidence.level === EConfidenceLevel.HIGH)
          .map((d) => d.diseaseCode),
      ),
  );
  const conflict = highOnImages.some((codesA, i) =>
    highOnImages.some(
      (codesB, j) =>
        i !== j && [...codesA].some((a) => [...codesB].some((b) => a !== b)),
    ),
  );
  return { hasDisease: diseases.length > 0, conflict, diseases };
}
