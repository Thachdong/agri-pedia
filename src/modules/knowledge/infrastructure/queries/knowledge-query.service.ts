import { Inject, Injectable } from '@nestjs/common';
import {
  IKnowledgeRepository,
  KNOWLEDGE_REPOSITORY,
} from '../../application/ports';
import {
  IKnowledgeQueryPort,
  TFindCandidatesInput,
  TKnowledgeCandidate,
  TKnowledgeDiagnosisCrop,
  TKnowledgeDiseaseCard,
  TKnowledgeDiseaseName,
} from '../../contracts';
import {
  Disease,
  diseaseCodeOf,
  EPlantPart,
  scoreCandidates,
} from '../../domain';

@Injectable()
export class KnowledgeQueryService implements IKnowledgeQueryPort {
  constructor(
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
  ) {}

  async findDiagnosisCrop(
    cropType: string,
  ): Promise<TKnowledgeDiagnosisCrop | null> {
    const crop = await this.knowledge.findCrop(cropType);
    if (!crop) return null;
    return {
      code: crop.code,
      nameEn: crop.nameEn,
      enabled: crop.enabled,
      kbVersion: crop.kbVersion,
      plantParts: crop.plantParts.map((part) => ({
        code: part.code,
        promptEn: part.promptEn,
      })),
      features: crop.features,
      prompt: { ...crop.prompt },
    };
  }

  async findCandidates(
    input: TFindCandidatesInput,
  ): Promise<TKnowledgeCandidate[][]> {
    const part = input.part as EPlantPart | null;
    const units = (await this.knowledge.listDiseasesByCrop(input.cropType))
      .filter((disease) => disease.isCandidateFor(part))
      .flatMap((disease) => disease.scoringUnits());
    return input.regions.map((region) =>
      scoreCandidates(
        units,
        { ...input.wholeImage, ...region },
        input.limit,
      ).map((candidate) => ({
        diseaseCode: candidate.diseaseCode,
        variantCode: candidate.variantCode,
        matchScore: candidate.matchScore,
      })),
    );
  }

  async getDiseaseCards(codes: string[]): Promise<TKnowledgeDiseaseCard[]> {
    const { diseaseCodes, byCode } = await this.diseasesOf(codes);
    return codes.flatMap(
      (code) => byCode.get(diseaseCodeOf(code))?.card(code, diseaseCodes) ?? [],
    );
  }

  async getDiseaseNames(codes: string[]): Promise<TKnowledgeDiseaseName[]> {
    const { byCode } = await this.diseasesOf(codes);
    return codes.flatMap((code) => {
      const disease = byCode.get(diseaseCodeOf(code));
      if (!disease) return [];
      const variant = code === disease.code ? null : disease.variant(code);
      if (code !== disease.code && !variant) return [];
      return [
        {
          code,
          diseaseCode: disease.code,
          diseaseName: disease.nameVi,
          variantName: variant?.names.vn ?? null,
          category: disease.category,
        },
      ];
    });
  }

  private async diseasesOf(
    codes: string[],
  ): Promise<{ diseaseCodes: string[]; byCode: Map<string, Disease> }> {
    const diseaseCodes = [...new Set(codes.map(diseaseCodeOf))];
    const diseases = await this.knowledge.findDiseasesByCodes(diseaseCodes);
    return {
      diseaseCodes,
      byCode: new Map(diseases.map((disease) => [disease.code, disease])),
    };
  }
}
