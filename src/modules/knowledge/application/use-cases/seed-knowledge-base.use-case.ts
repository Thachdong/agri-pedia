import { Inject, Injectable } from '@nestjs/common';
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
  kbVersion: string;
  cropCount: number;
  diseaseCount: number;
};

/** Writes the KB seed into the tables; idempotent (upsert by code, removed entries deleted). */
@Injectable()
export class SeedKnowledgeBaseUseCase {
  constructor(
    @Inject(KNOWLEDGE_BASE_SOURCE)
    private readonly source: IKnowledgeBaseSource,
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(): Promise<TSeedKnowledgeBaseOutput> {
    const snapshot = await this.source.load();
    await this.unitOfWork.runInTransaction(() =>
      this.knowledge.replaceKnowledgeBase(snapshot.crops, snapshot.diseases),
    );
    return {
      kbVersion: snapshot.kbVersion,
      cropCount: snapshot.crops.length,
      diseaseCount: snapshot.diseases.length,
    };
  }
}
