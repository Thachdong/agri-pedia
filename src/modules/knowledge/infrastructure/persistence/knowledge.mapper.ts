import {
  Crop,
  Disease,
  EAgentType,
  EDiseaseCategory,
  EPlantPart,
  EVerification,
} from '../../domain';
import { CropOrmEntity } from './crop.orm-entity';
import { DiseaseOrmEntity } from './disease.orm-entity';

export class KnowledgeMapper {
  static cropToDomain(row: CropOrmEntity): Crop {
    return Crop.restore({
      code: row.code,
      nameVi: row.nameVi,
      enabled: row.enabled,
    });
  }

  static cropToOrm(crop: Crop): CropOrmEntity {
    return Object.assign(new CropOrmEntity(), {
      code: crop.code,
      nameVi: crop.nameVi,
      enabled: crop.enabled,
    });
  }

  static diseaseToDomain(row: DiseaseOrmEntity): Disease {
    return Disease.restore({
      code: row.code,
      cropType: row.cropType,
      category: row.category as EDiseaseCategory,
      agentType: row.agentType as EAgentType,
      nameVi: row.nameVi,
      nameEn: row.nameEn,
      scientificName: row.scientificName,
      aliasesVi: row.aliasesVi,
      aliasesEn: row.aliasesEn,
      affectedParts: row.affectedParts as EPlantPart[],
      verification: row.verification as EVerification,
      profile: row.profile,
      content: row.data,
      kbVersion: row.kbVersion,
    });
  }

  static diseaseToOrm(disease: Disease): DiseaseOrmEntity {
    return Object.assign(new DiseaseOrmEntity(), {
      code: disease.code,
      cropType: disease.cropType,
      category: disease.category,
      agentType: disease.agentType,
      nameVi: disease.nameVi,
      nameEn: disease.nameEn,
      scientificName: disease.scientificName,
      aliasesVi: disease.aliasesVi,
      aliasesEn: disease.aliasesEn,
      affectedParts: disease.affectedParts,
      verification: disease.verification,
      profile: disease.profile,
      data: disease.content,
      kbVersion: disease.kbVersion,
    });
  }
}
