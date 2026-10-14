import { TBox, TObservations } from '../diagnosis-result.types';
import { EDiagnosisImageStatus } from '../enums/diagnosis-image-status.enum';

/** Region described by the vision describe step (B1). */
export type TDescribedRegion = {
  box: TBox;
  observations: TObservations;
  descriptionEn: string;
  descriptionVi: string;
};

/** Vision describe step (B1) result of one image. */
export type TDescribeResult = {
  isTargetCrop: 'YES' | 'NO' | 'UNSURE';
  quality: 'GOOD' | 'BLURRY' | 'TOO_FAR' | 'TOO_DARK';
  /** Plant part code of the crop or `UNSURE`. */
  detectedPart: string;
  wholeImage: TObservations;
  regions: TDescribedRegion[];
};

/** Image stops after B1 with `status`, or goes on to scoring with `regions`. */
export type TDescribeOutcome =
  | {
      status:
        | EDiagnosisImageStatus.NOT_TARGET_CROP
        | EDiagnosisImageStatus.LOW_QUALITY
        | EDiagnosisImageStatus.HEALTHY;
      regions: [];
    }
  | { status: null; regions: TDescribedRegion[] };

/** Observation enum of one crop feature, as far as region preparation needs it. */
export type TFeatureSpec = {
  level: 'region' | 'image';
  values: string[];
  /** `image` features: values that are not a symptom. */
  normal?: string[];
};

/** feature name -> spec, per crop. */
export type TFeatureSpecs = Record<string, TFeatureSpec>;

const UNSURE = 'UNSURE';

/**
 * Box inside the image: null when x/y are outside 0..1 or w/h <= 0 (or not numbers);
 * a box crossing the right/bottom edge is cut to the image.
 */
export function clampBox(box: TBox): TBox | null {
  const { x, y, w, h } = box;
  if (![x, y, w, h].every(Number.isFinite)) return null;
  if (x < 0 || x > 1 || y < 0 || y > 1 || w <= 0 || h <= 0) return null;
  const clamped = { x, y, w: Math.min(w, 1 - x), h: Math.min(h, 1 - y) };
  return clamped.w > 0 && clamped.h > 0 ? clamped : null;
}

/**
 * Whole-image observations show a problem without a distinct lesion (yellowing, stunting, pests...):
 * an `image` feature has a value that is neither normal nor UNSURE.
 */
export function isWholeImageAbnormal(
  wholeImage: TObservations,
  features: TFeatureSpecs,
): boolean {
  return Object.entries(wholeImage).some(([name, value]) => {
    const feature = features[name];
    return (
      feature?.level === 'image' &&
      value !== UNSURE &&
      !(feature.normal ?? []).includes(value)
    );
  });
}

/** Region covering the whole image, for problems that show on the whole plant; other region features UNSURE. */
export function wholeImageRegion(features: TFeatureSpecs): TDescribedRegion {
  const regionFeatures = Object.entries(features)
    .filter(([, feature]) => feature.level === 'region')
    .map(([name]) => name);
  return {
    box: { x: 0, y: 0, w: 1, h: 1 },
    observations: {
      ...Object.fromEntries(regionFeatures.map((name) => [name, UNSURE])),
      lesionShape: 'NO_DISTINCT_LESION',
      distribution: 'WHOLE_ORGAN',
    },
    descriptionEn: 'Abnormality over the whole image without a distinct lesion',
    descriptionVi: 'Bất thường trên toàn ảnh, không có vết bệnh rõ',
  };
}

/**
 * After B1: keeps regions with a valid box (cut to the image, at most `maxRegions`), adds a whole-image
 * region when there is none but the whole image looks abnormal, and decides whether the image stops here.
 * `isTargetCrop = UNSURE` goes on.
 */
export function prepareRegions(
  result: TDescribeResult,
  maxRegions: number,
  features: TFeatureSpecs,
): TDescribeOutcome {
  if (result.isTargetCrop === 'NO') {
    return { status: EDiagnosisImageStatus.NOT_TARGET_CROP, regions: [] };
  }
  if (result.quality !== 'GOOD') {
    return { status: EDiagnosisImageStatus.LOW_QUALITY, regions: [] };
  }
  const regions = result.regions
    .map((region) => ({ ...region, box: clampBox(region.box) }))
    .filter((region): region is TDescribedRegion => region.box !== null)
    .slice(0, maxRegions);
  if (
    regions.length === 0 &&
    isWholeImageAbnormal(result.wholeImage, features)
  ) {
    regions.push(wholeImageRegion(features));
  }
  if (regions.length === 0) {
    return { status: EDiagnosisImageStatus.HEALTHY, regions: [] };
  }
  return { status: null, regions };
}
