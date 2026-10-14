import { Crop, Disease, TCropProps } from '../../../domain';
import { IKnowledgeRepository } from '../knowledge.repository';

export class InMemoryKnowledgeRepository implements IKnowledgeRepository {
  readonly crops = new Map<string, Crop>();
  readonly diseases = new Map<string, Disease>();

  async listEnabledCrops(): Promise<Crop[]> {
    return [...this.crops.values()]
      .filter((crop) => crop.enabled)
      .sort(
        (a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code),
      );
  }

  async findCrop(code: string): Promise<Crop | null> {
    return this.crops.get(code) ?? null;
  }

  async listDiseasesByCrop(cropType: string): Promise<Disease[]> {
    return [...this.diseases.values()].filter((d) => d.cropType === cropType);
  }

  async findDisease(code: string): Promise<Disease | null> {
    return this.diseases.get(code) ?? null;
  }

  async findDiseasesByCodes(codes: string[]): Promise<Disease[]> {
    return codes.flatMap((code) => this.diseases.get(code) ?? []);
  }

  async replaceKnowledgeBase(
    crops: Crop[],
    diseases: Disease[],
  ): Promise<void> {
    const cropCodes = new Set(crops.map((crop) => crop.code));
    const kept = new Set(diseases.map((disease) => disease.code));
    for (const [code, disease] of this.diseases) {
      if (cropCodes.has(disease.cropType) && !kept.has(code)) {
        this.diseases.delete(code);
      }
    }
    for (const [code, crop] of this.crops) {
      if (!cropCodes.has(code) && crop.enabled) {
        this.crops.set(
          code,
          Crop.restore({ ...cropProps(crop), enabled: false }),
        );
      }
    }
    for (const crop of crops) this.crops.set(crop.code, crop);
    for (const disease of diseases) this.diseases.set(disease.code, disease);
  }
}

function cropProps(crop: Crop): TCropProps {
  return {
    code: crop.code,
    nameVi: crop.nameVi,
    nameEn: crop.nameEn,
    enabled: crop.enabled,
    kbVersion: crop.kbVersion,
    sortOrder: crop.sortOrder,
    plantParts: crop.plantParts,
    cropStages: crop.cropStages,
    features: crop.features,
    prompt: crop.prompt,
  };
}
