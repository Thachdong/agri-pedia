import { Crop, Disease } from '../../domain';

export type TKnowledgeBaseSnapshot = {
  /** Every crop of the seed, each with its own `kbVersion`. */
  crops: Crop[];
  diseases: Disease[];
};

/** Source of the KB master data (seed files). */
export interface IKnowledgeBaseSource {
  /** Reads and checks the KB; throws when it is inconsistent (e.g. a crop's profile and KB versions differ). */
  load(): Promise<TKnowledgeBaseSnapshot>;
}

export const KNOWLEDGE_BASE_SOURCE = Symbol('KNOWLEDGE_BASE_SOURCE');
