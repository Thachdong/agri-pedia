import { Inject, Injectable } from '@nestjs/common';
import {
  EAgentType,
  EDiseaseCategory,
  EPlantPart,
  EVerification,
  KnowledgeCropNotFoundException,
} from '../../domain';
import {
  IKnowledgeRepository,
  KNOWLEDGE_REPOSITORY,
} from '../ports/knowledge.repository';

export type TListDiseasesInput = {
  crop: string;
  category?: EDiseaseCategory;
  /** Matched against names and aliases, ignoring case and diacritics. */
  q?: string;
};

export type TDiseaseListItem = {
  code: string;
  nameVi: string;
  nameEn: string;
  scientificName: string | null;
  /** Vietnamese then English aliases. */
  aliases: string[];
  category: EDiseaseCategory;
  agentType: EAgentType;
  affectedParts: EPlantPart[];
  verification: EVerification;
};

export type TListDiseasesOutput = { diseases: TDiseaseListItem[] };

/** Diseases of a crop, filtered, by Vietnamese name; no pagination (~50 per crop) (public). */
@Injectable()
export class ListDiseasesUseCase {
  constructor(
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
  ) {}

  async execute(input: TListDiseasesInput): Promise<TListDiseasesOutput> {
    if (!(await this.knowledge.findCrop(input.crop))) {
      throw new KnowledgeCropNotFoundException(input.crop);
    }
    const diseases = (await this.knowledge.listDiseasesByCrop(input.crop))
      .filter((d) => !input.category || d.category === input.category)
      .filter((d) => !input.q || d.matchesQuery(input.q))
      .sort((a, b) => a.nameVi.localeCompare(b.nameVi, 'vi'));
    return {
      diseases: diseases.map((d) => ({
        code: d.code,
        nameVi: d.nameVi,
        nameEn: d.nameEn,
        scientificName: d.scientificName,
        aliases: [...d.aliasesVi, ...d.aliasesEn],
        category: d.category,
        agentType: d.agentType,
        affectedParts: d.affectedParts,
        verification: d.verification,
      })),
    };
  }
}
