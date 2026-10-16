import {
  EAgentType,
  EArticleStatus,
  ECropStage,
  EDiseaseCategory,
  EPlantPart,
  EVerification,
} from '../../../domain';

export class CropPlantPartResponse {
  /** Value for `images[].plantPart` of POST /diagnoses. */
  code: EPlantPart;
  nameVi: string;
}

export class CropStageResponse {
  /** Code used in disease `cropStages`. */
  code: ECropStage;
  nameVi: string;
}

export class CropItemResponse {
  /** Value for `cropType` of POST /diagnoses. */
  code: string;
  nameVi: string;
  /** Parts a photo of this crop may show, in dropdown order. */
  plantParts: CropPlantPartResponse[];
  /** Labels of the crop's stage codes. */
  cropStages: CropStageResponse[];
}

export class ListCropsResponse {
  crops: CropItemResponse[];
}

export class DiseaseItemResponse {
  code: string;
  nameVi: string;
  nameEn: string;
  scientificName: string | null;
  aliases: string[];
  category: EDiseaseCategory;
  agentType: EAgentType;
  affectedParts: EPlantPart[];
  verification: EVerification;
}

export class ListDiseasesResponse {
  diseases: DiseaseItemResponse[];
}

export class DiseaseVariantResponse {
  code: string;
  name: string;
  affectedParts: string;
  symptoms: string[];
}

export class DiseaseTreatmentsResponse {
  cultural: string[];
  biological: string[];
  nutrition: string[];
}

export class SimilarDiseaseResponse {
  code: string;
  name: string;
  /** null when the KB has no distinguishing feature yet. */
  distinguishingFeature: string | null;
}

export class DiseaseReferenceResponse {
  title: string;
  url: string;
}

export class DiseaseArticleResponse {
  /** GET /knowledge/articles/:cropSlug/:slug path, e.g. `/benh-cay-trong/lua/benh-dao-on`. */
  path: string;
  status: EArticleStatus;
}

export class DiseaseDetailResponse {
  code: string;
  nameVi: string;
  nameEn: string;
  scientificName: string | null;
  aliases: string[];
  category: EDiseaseCategory;
  agentType: EAgentType;
  affectedParts: EPlantPart[];
  pathogens: string[];
  symptoms: string[];
  variants: DiseaseVariantResponse[];
  transmissionMode: string | null;
  cropStages: ECropStage[];
  favorableConditions: string[];
  treatments: DiseaseTreatmentsResponse;
  similarDiseases: SimilarDiseaseResponse[];
  references: DiseaseReferenceResponse[];
  /** Not SOURCED: show "not yet confirmed by experts". */
  verification: EVerification;
  kbVersion: string;
  /** null when the disease has no article. */
  article: DiseaseArticleResponse | null;
}
