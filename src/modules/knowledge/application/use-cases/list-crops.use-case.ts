import { Inject, Injectable } from '@nestjs/common';
import {
  IKnowledgeRepository,
  KNOWLEDGE_REPOSITORY,
} from '../ports/knowledge.repository';

export type TListCropsOutput = {
  crops: Array<{ code: string; nameVi: string }>;
};

/** Crops supported by diagnosis (public). */
@Injectable()
export class ListCropsUseCase {
  constructor(
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
  ) {}

  async execute(): Promise<TListCropsOutput> {
    const crops = await this.knowledge.listEnabledCrops();
    return {
      crops: crops.map((crop) => ({ code: crop.code, nameVi: crop.nameVi })),
    };
  }
}
