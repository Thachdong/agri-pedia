import {
  mergeWeights,
  TDiseaseProfile,
  TScoringUnit,
} from '../disease-profile';
import { EAgentType } from '../enums/agent-type.enum';
import { ECropStage } from '../enums/crop-stage.enum';
import { EDiseaseCategory } from '../enums/disease-category.enum';
import { EPlantPart } from '../enums/plant-part.enum';
import { EVerification } from '../enums/verification.enum';

/** Same content in Vietnamese (display) and English (matching, AI prompts). */
export type TLocalizedList = { vn: string[]; en: string[] };
export type TLocalizedText = { vn: string; en: string };

export type TDiseaseVariant = {
  /** `<diseaseCode>__V<n>`. */
  code: string;
  names: { vn: string; en: string; scientific: string | null };
  affectedPart: TLocalizedText;
  symptoms: TLocalizedList;
};

export type TSimilarDisease = {
  code: string;
  distinguishingFeature: TLocalizedText | null;
};

export type TDiseaseContent = {
  pathogens: TLocalizedList;
  symptoms: TLocalizedList;
  variants: TDiseaseVariant[];
  transmissionMode: TLocalizedList | null;
  cropStages: ECropStage[];
  favorableConditions: TLocalizedList;
  treatments: {
    cultural: TLocalizedList;
    biological: TLocalizedList;
    nutrition: TLocalizedList;
  };
  similarDiseases: TSimilarDisease[];
  /** English keywords matched against observations. */
  visualKeywords: string[];
  references: Array<{ title: string; url: string }>;
};

export type TDiseaseProps = {
  /** Stable KB id, e.g. `RICE_BLAST`. */
  code: string;
  cropType: string;
  category: EDiseaseCategory;
  agentType: EAgentType;
  nameVi: string;
  nameEn: string;
  scientificName: string | null;
  aliasesVi: string[];
  aliasesEn: string[];
  affectedParts: EPlantPart[];
  verification: EVerification;
  /** Scoring weights; null = never a diagnosis candidate. */
  profile: TDiseaseProfile | null;
  content: TDiseaseContent;
  /** KB version this entry was seeded from, e.g. `2026-10-12`. */
  kbVersion: string;
};

/** English summary of a candidate, sent to the verify step (B3). */
export type TDiseaseCard = {
  /** diseaseCode or variantCode. */
  code: string;
  name: string;
  symptoms: string[];
  visualKeywords: string[];
  /** How to tell this apart from the other candidates under consideration. */
  distinguishFrom: Array<{ code: string; feature: string }>;
};

/** diseaseCode of a diseaseCode or variantCode (`RICE_BLAST__V1` -> `RICE_BLAST`). */
export function diseaseCodeOf(code: string): string {
  return code.split('__')[0];
}

/** Lowercase, no diacritics (đ -> d), for accent-insensitive search. */
function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Disease, pest or disorder of a crop (KB master data, read-only). */
export class Disease {
  private constructor(private readonly props: TDiseaseProps) {}

  static restore(props: TDiseaseProps): Disease {
    return new Disease({ ...props });
  }

  get code(): string {
    return this.props.code;
  }

  get cropType(): string {
    return this.props.cropType;
  }

  get category(): EDiseaseCategory {
    return this.props.category;
  }

  get agentType(): EAgentType {
    return this.props.agentType;
  }

  get nameVi(): string {
    return this.props.nameVi;
  }

  get nameEn(): string {
    return this.props.nameEn;
  }

  get scientificName(): string | null {
    return this.props.scientificName;
  }

  get aliasesVi(): string[] {
    return this.props.aliasesVi;
  }

  get aliasesEn(): string[] {
    return this.props.aliasesEn;
  }

  get affectedParts(): EPlantPart[] {
    return this.props.affectedParts;
  }

  get verification(): EVerification {
    return this.props.verification;
  }

  get profile(): TDiseaseProfile | null {
    return this.props.profile;
  }

  get content(): TDiseaseContent {
    return this.props.content;
  }

  get kbVersion(): string {
    return this.props.kbVersion;
  }

  /** Name (vi) or alias (vi/en) contains `query`, ignoring case and diacritics. */
  matchesQuery(query: string): boolean {
    const needle = foldText(query.trim());
    return [
      this.props.nameVi,
      this.props.nameEn,
      ...this.props.aliasesVi,
      ...this.props.aliasesEn,
    ].some((text) => foldText(text).includes(needle));
  }

  /**
   * May be a diagnosis candidate for an observed plant part: not GEMINI_ONLY, has a profile,
   * and affects `part` or the whole plant (`part` null = any part).
   */
  isCandidateFor(part: EPlantPart | null): boolean {
    if (this.props.verification === EVerification.GEMINI_ONLY) return false;
    if (!this.props.profile) return false;
    if (part === null) return true;
    return (
      this.props.affectedParts.includes(part) ||
      this.props.affectedParts.includes(EPlantPart.WHOLE_PLANT)
    );
  }

  /** Units to score: each variant (base + its overrides) or, without variants, the entry itself. */
  scoringUnits(): TScoringUnit[] {
    const profile = this.props.profile;
    if (!profile) return [];
    const variants = this.props.content.variants;
    if (variants.length === 0) {
      return [
        {
          diseaseCode: this.code,
          variantCode: null,
          weights: mergeWeights(profile.base),
        },
      ];
    }
    return variants.map((variant) => ({
      diseaseCode: this.code,
      variantCode: variant.code,
      weights: mergeWeights(profile.base, profile.variants?.[variant.code]),
    }));
  }

  variant(variantCode: string): TDiseaseVariant | null {
    return (
      this.props.content.variants.find((v) => v.code === variantCode) ?? null
    );
  }

  /**
   * English card of this entry or one of its variants (`code` = diseaseCode or variantCode);
   * null when the variant does not exist. `distinguishFrom` keeps only diseases in `candidateDiseaseCodes`.
   */
  card(code: string, candidateDiseaseCodes: string[]): TDiseaseCard | null {
    const content = this.props.content;
    const variant = code === this.code ? null : this.variant(code);
    if (code !== this.code && !variant) return null;
    return {
      code,
      name: variant ? variant.names.en : this.props.nameEn,
      symptoms: [...content.symptoms.en, ...(variant?.symptoms.en ?? [])],
      visualKeywords: content.visualKeywords,
      distinguishFrom: content.similarDiseases
        .filter(
          (similar) =>
            similar.distinguishingFeature !== null &&
            similar.code !== this.code &&
            candidateDiseaseCodes.includes(similar.code),
        )
        .map((similar) => ({
          code: similar.code,
          feature: similar.distinguishingFeature.en,
        })),
    };
  }
}
