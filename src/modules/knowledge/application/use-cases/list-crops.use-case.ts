import { Inject, Injectable } from '@nestjs/common';
import { ECropStage, EPlantPart } from '../../domain';
import {
  IKnowledgeRepository,
  KNOWLEDGE_REPOSITORY,
} from '../ports/knowledge.repository';

export type TListCropsOutput = {
  crops: Array<{
    code: string;
    nameVi: string;
    /** Parts a photo of this crop may show (diagnosis `plantPart`). */
    plantParts: Array<{ code: EPlantPart; nameVi: string }>;
    /** Labels of the crop stage codes used by its diseases. */
    cropStages: Array<{ code: ECropStage; nameVi: string }>;
  }>;
};

/** Crops supported by diagnosis (public), by sortOrder. */
@Injectable()
export class ListCropsUseCase {
  constructor(
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
  ) {}

  async execute(): Promise<TListCropsOutput> {
    const crops = await this.knowledge.listEnabledCrops();
    return {
      crops: crops.map((crop) => ({
        code: crop.code,
        nameVi: crop.nameVi,
        plantParts: crop.plantParts.map((part) => ({
          code: part.code,
          nameVi: part.nameVi,
        })),
        cropStages: crop.cropStages.map((stage) => ({
          code: stage.code,
          nameVi: stage.nameVi,
        })),
      })),
    };
  }
}
