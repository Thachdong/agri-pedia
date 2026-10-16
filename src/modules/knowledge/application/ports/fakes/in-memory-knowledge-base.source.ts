import {
  IKnowledgeBaseSource,
  TKnowledgeBaseSnapshot,
} from '../knowledge-base-source';

export class InMemoryKnowledgeBaseSource implements IKnowledgeBaseSource {
  constructor(public snapshot: TKnowledgeBaseSnapshot) {}

  async load(): Promise<TKnowledgeBaseSnapshot> {
    return this.snapshot;
  }
}
