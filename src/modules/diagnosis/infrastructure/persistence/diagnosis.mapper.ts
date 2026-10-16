import {
  Diagnosis,
  DiagnosisImage,
  EDiagnosisFeedback,
  EDiagnosisImageStatus,
  EDiagnosisStatus,
  EPlantPart,
} from '../../domain';
import { DiagnosisImageOrmEntity } from './diagnosis-image.orm-entity';
import { DiagnosisOrmEntity } from './diagnosis.orm-entity';

export class DiagnosisMapper {
  static toDomain(
    row: DiagnosisOrmEntity,
    imageRows: DiagnosisImageOrmEntity[],
  ): Diagnosis {
    return Diagnosis.restore(row.id, {
      userId: row.userId,
      cropType: row.cropType,
      note: row.note,
      status: row.status as EDiagnosisStatus,
      provider: row.provider,
      model: row.model,
      promptVersion: row.promptVersion,
      kbVersion: row.kbVersion,
      summary: row.summary,
      failureReason: row.failureReason,
      userFeedback: row.userFeedback as EDiagnosisFeedback | null,
      feedbackComment: row.feedbackComment,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
      images: imageRows.map((image) =>
        DiagnosisImage.restore(image.id, {
          sortOrder: image.sortOrder,
          plantPart: image.plantPart as EPlantPart,
          mediaId: image.mediaId,
          detectedPart: image.detectedPart as EPlantPart | null,
          status: image.status as EDiagnosisImageStatus | null,
          diseases: image.diseases,
          regions: image.regions,
          b1Raw: image.b1Raw,
          b3Raw: image.b3Raw,
        }),
      ),
    });
  }

  static toOrm(diagnosis: Diagnosis): DiagnosisOrmEntity {
    return Object.assign(new DiagnosisOrmEntity(), {
      id: diagnosis.id,
      userId: diagnosis.userId,
      cropType: diagnosis.cropType,
      status: diagnosis.status,
      note: diagnosis.note,
      provider: diagnosis.provider,
      model: diagnosis.model,
      promptVersion: diagnosis.promptVersion,
      kbVersion: diagnosis.kbVersion,
      summary: diagnosis.summary,
      failureReason: diagnosis.failureReason,
      userFeedback: diagnosis.userFeedback,
      feedbackComment: diagnosis.feedbackComment,
      createdAt: diagnosis.createdAt,
      completedAt: diagnosis.completedAt,
    });
  }

  static imagesToOrm(diagnosis: Diagnosis): DiagnosisImageOrmEntity[] {
    return diagnosis.images.map((image) =>
      Object.assign(new DiagnosisImageOrmEntity(), {
        id: image.id,
        diagnosisId: diagnosis.id,
        mediaId: image.mediaId,
        sortOrder: image.sortOrder,
        plantPart: image.plantPart,
        detectedPart: image.detectedPart,
        status: image.status,
        diseases: image.diseases,
        regions: image.regions,
        b1Raw: image.b1Raw,
        b3Raw: image.b3Raw,
      }),
    );
  }
}
