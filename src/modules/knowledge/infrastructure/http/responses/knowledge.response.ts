import {
  EAgentType,
  ECropStage,
  EDiseaseCategory,
  EPlantPart,
  EVerification,
} from '../../../domain';

export class CropItemResponse {
  code: string;
  nameVi: string;
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
}
