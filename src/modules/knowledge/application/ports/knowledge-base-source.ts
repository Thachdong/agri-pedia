import { Crop, Disease } from '../../domain';

export type TKnowledgeBaseSnapshot = {
  /** KB version, e.g. `2026-10-12`. */
  kbVersion: string;
  crops: Crop[];
  diseases: Disease[];
};

/** Source of the KB master data (seed files). */
export interface IKnowledgeBaseSource {
  /** Reads and checks the KB; throws when it is inconsistent (e.g. profile and KB versions differ). */
  load(): Promise<TKnowledgeBaseSnapshot>;
}

export const KNOWLEDGE_BASE_SOURCE = Symbol('KNOWLEDGE_BASE_SOURCE');
