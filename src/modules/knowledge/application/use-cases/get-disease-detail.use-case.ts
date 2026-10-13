import { Inject, Injectable } from '@nestjs/common';
import {
  EAgentType,
  ECropStage,
  EDiseaseCategory,
  EPlantPart,
  EVerification,
  KnowledgeDiseaseNotFoundException,
} from '../../domain';
import {
  IKnowledgeRepository,
  KNOWLEDGE_REPOSITORY,
} from '../ports/knowledge.repository';

export type TGetDiseaseDetailInput = { code: string };

/** Vietnamese part of a KB entry; no chemical recommendations exist in the KB. */
export type TGetDiseaseDetailOutput = {
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
  variants: Array<{
    code: string;
    name: string;
    affectedParts: string;
    symptoms: string[];
  }>;
  transmissionMode: string | null;
  cropStages: ECropStage[];
  favorableConditions: string[];
  treatments: { cultural: string[]; biological: string[]; nutrition: string[] };
  similarDiseases: Array<{
    code: string;
    name: string;
    distinguishingFeature: string | null;
  }>;
  references: Array<{ title: string; url: string }>;
  verification: EVerification;
  kbVersion: string;
};

/** One KB entry for reading (public). */
@Injectable()
export class GetDiseaseDetailUseCase {
  constructor(
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
  ) {}

  async execute(
    input: TGetDiseaseDetailInput,
  ): Promise<TGetDiseaseDetailOutput> {
    const disease = await this.knowledge.findDisease(input.code);
    if (!disease) throw new KnowledgeDiseaseNotFoundException(input.code);

    const content = disease.content;
    const similar = await this.knowledge.findDiseasesByCodes(
      content.similarDiseases.map((s) => s.code),
    );
    const nameByCode = new Map(similar.map((d) => [d.code, d.nameVi]));

    return {
      code: disease.code,
      nameVi: disease.nameVi,
      nameEn: disease.nameEn,
      scientificName: disease.scientificName,
      aliases: [...disease.aliasesVi, ...disease.aliasesEn],
      category: disease.category,
      agentType: disease.agentType,
      affectedParts: disease.affectedParts,
      pathogens: content.pathogens.vn,
      symptoms: content.symptoms.vn,
      variants: content.variants.map((variant) => ({
        code: variant.code,
        name: variant.names.vn,
        affectedParts: variant.affectedPart.vn,
        symptoms: variant.symptoms.vn,
      })),
      transmissionMode: content.transmissionMode
        ? content.transmissionMode.vn.join(' ')
        : null,
      cropStages: content.cropStages,
      favorableConditions: content.favorableConditions.vn,
      treatments: {
        cultural: content.treatments.cultural.vn,
        biological: content.treatments.biological.vn,
        nutrition: content.treatments.nutrition.vn,
      },
      similarDiseases: content.similarDiseases.map((s) => ({
        code: s.code,
        name: nameByCode.get(s.code) ?? s.code,
        distinguishingFeature: s.distinguishingFeature?.vn ?? null,
      })),
      references: content.references,
      verification: disease.verification,
      kbVersion: disease.kbVersion,
    };
  }
}
