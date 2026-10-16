import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  IKnowledgeBaseSource,
  KNOWLEDGE_BASE_SOURCE,
} from '../ports/knowledge-base-source';
import {
  IKnowledgeRepository,
  KNOWLEDGE_REPOSITORY,
} from '../ports/knowledge.repository';

export type TSeedKnowledgeBaseOutput = {
  crops: Array<{ code: string; kbVersion: string; enabled: boolean }>;
  diseaseCount: number;
};

/**
 * Writes the KB seed into the tables; idempotent (upsert by code, removed entries deleted,
 * crops no longer seeded disabled). Crops listed in `knowledge.enabledCrops` are enabled
 * whatever their seed says.
 */
@Injectable()
export class SeedKnowledgeBaseUseCase {
  constructor(
    @Inject(KNOWLEDGE_BASE_SOURCE)
    private readonly source: IKnowledgeBaseSource,
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(): Promise<TSeedKnowledgeBaseOutput> {
    const snapshot = await this.source.load();
    const { enabledCrops } = this.config.get('knowledge');
    const seeded = new Set(snapshot.crops.map((crop) => crop.code));
    const unknown = enabledCrops.filter((code) => !seeded.has(code));
    if (unknown.length > 0) {
      throw new Error(
        `KNOWLEDGE_ENABLED_CROPS lists crops that are not seeded: ${unknown.join(', ')}`,
      );
    }
    const crops = snapshot.crops.map((crop) =>
      enabledCrops.includes(crop.code) ? crop.enable() : crop,
    );

    await this.unitOfWork.runInTransaction(() =>
      this.knowledge.replaceKnowledgeBase(crops, snapshot.diseases),
    );
    return {
      crops: crops.map((crop) => ({
        code: crop.code,
        kbVersion: crop.kbVersion,
        enabled: crop.enabled,
      })),
      diseaseCount: snapshot.diseases.length,
    };
  }
}
