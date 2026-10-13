import { Crop, Disease } from '../../domain';

export interface IKnowledgeRepository {
  /** Crops with `enabled` = true, by code. */
  listEnabledCrops(): Promise<Crop[]>;
  findCrop(code: string): Promise<Crop | null>;
  /** Every disease of the crop, any order. */
  listDiseasesByCrop(cropType: string): Promise<Disease[]>;
  findDisease(code: string): Promise<Disease | null>;
  /** Diseases with these codes; unknown codes are left out. */
  findDiseasesByCodes(codes: string[]): Promise<Disease[]>;
  /**
   * Upserts crops and diseases by code, and deletes diseases of these crops that are no longer listed.
   * Must run inside a transaction.
   */
  replaceKnowledgeBase(crops: Crop[], diseases: Disease[]): Promise<void>;
}

export const KNOWLEDGE_REPOSITORY = Symbol('KNOWLEDGE_REPOSITORY');
