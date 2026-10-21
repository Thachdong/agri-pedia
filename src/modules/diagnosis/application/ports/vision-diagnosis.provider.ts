import {
  TKnowledgeDiagnosisCrop,
  TKnowledgeDiseaseCard,
} from '@modules/knowledge/contracts';
import {
  EPlantPart,
  TDescribeResult,
  TObservations,
  TVerifyRegionResult,
} from '../../domain';
import { TProcessedImage } from './image-processor';

/** What a diagnosis records about the AI that produced it. */
export type TVisionProviderInfo = {
  provider: string;
  /** `<describe model>+<verify model>`. */
  model: string;
  /** `<describe prompt>+<verify prompt>/<crop>@<kbVersion>`, e.g. `d2+v2/RICE@2026-10-12`. */
  promptVersion: string;
};

/** Models of the two AI steps, as resolved for one diagnosis. */
export type TVisionModels = {
  describeModel: string;
  verifyModel: string;
};

/** B1 input: one image. */
export type TDescribeInput = {
  model: string;
  image: TProcessedImage;
  /** Crop the photo should show; its features and parts shape the output. */
  crop: TKnowledgeDiagnosisCrop;
  /** Part chosen by the user; only a hint. */
  plantPart: EPlantPart | null;
  maxRegions: number;
};

export type TDescribeOutput = {
  result: TDescribeResult;
  /** Verbatim answer, for debugging. */
  raw: unknown;
};

/** B3 input: one image with the crops of its regions that have candidates. */
export type TVerifyInput = {
  model: string;
  crop: TKnowledgeDiagnosisCrop;
  /** Downscaled whole image, for context. */
  thumbnail: TProcessedImage;
  regions: Array<{
    regionIndex: number;
    crop: TProcessedImage;
    observations: TObservations;
    descriptionEn: string;
    /** diseaseCode or variantCode the answer must choose from (or NONE). */
    candidateCodes: string[];
  }>;
  /** Cards of every candidate of the image, without duplicates. */
  cards: TKnowledgeDiseaseCard[];
};

export type TVerifyOutput = {
  /** Regions missing from the answer count as NONE. */
  regions: Array<TVerifyRegionResult & { regionIndex: number }>;
  raw: unknown;
};

/** AI vision steps; each call is one request. Throws on provider error, timeout or invalid output. */
export interface IVisionDiagnosisProvider {
  /** Provider, models and prompt version used for photos of `crop` with `models`. */
  info(
    crop: TKnowledgeDiagnosisCrop,
    models: TVisionModels,
  ): TVisionProviderInfo;
  /** B1: regions + observations of one image; never a diagnosis. */
  describe(input: TDescribeInput): Promise<TDescribeOutput>;
  /** B3: per region, one of its candidate codes or NONE. */
  verify(input: TVerifyInput): Promise<TVerifyOutput>;
}

export const VISION_DIAGNOSIS_PROVIDER = Symbol('VISION_DIAGNOSIS_PROVIDER');
