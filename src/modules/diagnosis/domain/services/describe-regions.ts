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
  /** EPlantPart value or `UNSURE`. */
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

const NOT_ABNORMAL = ['NONE', 'UNSURE'];
const ABNORMAL_PANICLE = [
  'EMPTY_ERECT_WHITE',
  'DISCOLORED_GRAINS',
  'NOT_FULLY_EMERGED',
  'BROKEN_NECK',
];
/** Region features left UNSURE on the synthetic whole-image region. */
const OTHER_REGION_FEATURES = [
  'centerColor',
  'borderColor',
  'margin',
  'halo',
  'size',
  'position',
  'sign',
  'deformation',
];

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

/** Whole-image observations show a problem without a distinct lesion (tungro, deficiency, pests...). */
export function isWholeImageAbnormal(wholeImage: TObservations): boolean {
  const { discoloration, plantForm, panicle, pestsVisible } = wholeImage;
  return (
    (discoloration !== undefined && !NOT_ABNORMAL.includes(discoloration)) ||
    (plantForm !== undefined && !['NORMAL', 'UNSURE'].includes(plantForm)) ||
    (panicle !== undefined && ABNORMAL_PANICLE.includes(panicle)) ||
    (pestsVisible !== undefined && !NOT_ABNORMAL.includes(pestsVisible))
  );
}

/** Region covering the whole image, for problems that show on the whole plant. */
export function wholeImageRegion(): TDescribedRegion {
  return {
    box: { x: 0, y: 0, w: 1, h: 1 },
    observations: {
      lesionShape: 'NO_DISTINCT_LESION',
      distribution: 'WHOLE_ORGAN',
      ...Object.fromEntries(OTHER_REGION_FEATURES.map((f) => [f, 'UNSURE'])),
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
  if (regions.length === 0 && isWholeImageAbnormal(result.wholeImage)) {
    regions.push(wholeImageRegion());
  }
  if (regions.length === 0) {
    return { status: EDiagnosisImageStatus.HEALTHY, regions: [] };
  }
  return { status: null, regions };
}
