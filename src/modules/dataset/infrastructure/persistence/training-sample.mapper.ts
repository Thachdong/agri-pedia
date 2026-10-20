import { ELabelSource, TrainingSample } from '../../domain';
import { TrainingSampleOrmEntity } from './training-sample.orm-entity';

export class TrainingSampleMapper {
  static toDomain(row: TrainingSampleOrmEntity): TrainingSample {
    return TrainingSample.restore(row.id, {
      diagnosisId: row.diagnosisId,
      sortOrder: row.sortOrder,
      cropType: row.cropType,
      plantPart: row.plantPart,
      diseaseCode: row.diseaseCode,
      variantCode: row.variantCode,
      confidenceScore: row.confidenceScore,
      regions: row.regions,
      imageKey: row.imageKey,
      labelSource: row.labelSource as ELabelSource,
      provider: row.provider,
      model: row.model,
      promptVersion: row.promptVersion,
      kbVersion: row.kbVersion,
      createdAt: row.createdAt,
    });
  }

  static toOrm(sample: TrainingSample): TrainingSampleOrmEntity {
    return Object.assign(new TrainingSampleOrmEntity(), {
      id: sample.id,
      diagnosisId: sample.diagnosisId,
      sortOrder: sample.sortOrder,
      cropType: sample.cropType,
      plantPart: sample.plantPart,
      diseaseCode: sample.diseaseCode,
      variantCode: sample.variantCode,
      confidenceScore: sample.confidenceScore,
      regions: sample.regions,
      imageKey: sample.imageKey,
      labelSource: sample.labelSource,
      provider: sample.provider,
      model: sample.model,
      promptVersion: sample.promptVersion,
      kbVersion: sample.kbVersion,
      createdAt: sample.createdAt,
    });
  }
}
