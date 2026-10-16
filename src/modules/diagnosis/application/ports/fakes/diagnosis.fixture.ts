import { randomUUID } from 'node:crypto';
import {
  Diagnosis,
  DiagnosisImage,
  EDiagnosisStatus,
  EPlantPart,
  TDiagnosisImageProps,
  TDiagnosisProps,
} from '../../../domain';

/** Test helper: a restored diagnosis; images default to one pending LEAF image. */
export function buildDiagnosis(
  overrides: Partial<Omit<TDiagnosisProps, 'images'>> & {
    id?: string;
    images?: Array<Partial<TDiagnosisImageProps>>;
  } = {},
): Diagnosis {
  const { id = randomUUID(), images = [{}], ...props } = overrides;
  return Diagnosis.restore(id, {
    userId: 'u1',
    cropType: 'RICE',
    note: null,
    status: EDiagnosisStatus.PROCESSING,
    provider: 'GEMINI',
    model: 'm',
    promptVersion: 'd1+v1',
    kbVersion: '2026-10-12',
    summary: null,
    failureReason: null,
    userFeedback: null,
    feedbackComment: null,
    createdAt: new Date('2026-10-13T00:00:00Z'),
    completedAt: null,
    ...props,
    images: images.map((image, index) =>
      DiagnosisImage.restore(randomUUID(), {
        sortOrder: index,
        plantPart: EPlantPart.LEAF,
        mediaId: null,
        detectedPart: null,
        status: null,
        diseases: [],
        regions: [],
        b1Raw: null,
        b3Raw: null,
        ...image,
      }),
    ),
  });
}
