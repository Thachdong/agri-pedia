/** Normalized box on the image: 0..1, x/y = top-left corner. */
export type TSampleBox = { x: number; y: number; w: number; h: number };

/** Disease concluded for a diagnosis image; `level` is the diagnosis confidence level (HIGH/MEDIUM/LOW). */
export type TCandidateDisease = {
  diseaseCode: string;
  variantCode: string | null;
  level: string;
  score: number;
};

/** Abnormal region of a diagnosis image; `level`/`score` null when the region is uncertain. */
export type TCandidateRegion = {
  box: TSampleBox;
  diseaseCode: string | null;
  level: string | null;
  score: number | null;
};

/** One image of a completed diagnosis, as seen by the dataset. */
export type TCandidateImage = {
  sortOrder: number;
  /** Stored file; null when the upload failed. */
  key: string | null;
  diseases: TCandidateDisease[];
  regions: TCandidateRegion[];
};

/** Labelled region kept with a sample. */
export type TSampleRegion = { box: TSampleBox; score: number };

export type TSelectedImage = {
  sortOrder: number;
  key: string;
  diseaseCode: string;
  variantCode: string | null;
  score: number;
  regions: TSampleRegion[];
};

const HIGH = 'HIGH';

/**
 * Keeps the image as a training sample when its label is unambiguous: the diagnosis has no conflict,
 * the image was stored, it concludes exactly one disease, at HIGH confidence, and no region is uncertain.
 * Kept regions = the HIGH regions of that disease.
 */
export function selectTrainingImage(
  image: TCandidateImage,
  conflict: boolean,
): TSelectedImage | null {
  if (conflict || image.key === null || image.diseases.length !== 1) {
    return null;
  }
  const [disease] = image.diseases;
  if (disease.level !== HIGH) return null;
  if (image.regions.some((region) => region.level === null)) return null;
  const regions = image.regions.flatMap((region) =>
    region.diseaseCode === disease.diseaseCode &&
    region.level === HIGH &&
    region.score !== null
      ? [{ box: region.box, score: region.score }]
      : [],
  );
  if (regions.length === 0) return null;
  return {
    sortOrder: image.sortOrder,
    key: image.key,
    diseaseCode: disease.diseaseCode,
    variantCode: disease.variantCode,
    score: disease.score,
    regions,
  };
}
