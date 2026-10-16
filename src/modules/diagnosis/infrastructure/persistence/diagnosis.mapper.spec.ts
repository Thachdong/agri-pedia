import { buildDiagnosis } from '../../application/ports/fakes';
import {
  EConfidenceLevel,
  EDiagnosisFeedback,
  EDiagnosisImageStatus,
  EDiagnosisStatus,
  EPlantPart,
} from '../../domain';
import { DiagnosisMapper } from './diagnosis.mapper';

describe('DiagnosisMapper', () => {
  it('round-trips a diagnosis with its images', () => {
    const confidence = { level: EConfidenceLevel.HIGH, score: 0.85 };
    const diagnosis = buildDiagnosis({
      status: EDiagnosisStatus.COMPLETED,
      note: 'lá vàng',
      summary: {
        hasDisease: true,
        conflict: false,
        diseases: [{ diseaseCode: 'RICE_BLAST', confidence, imageCount: 1 }],
      },
      userFeedback: EDiagnosisFeedback.CORRECT,
      feedbackComment: 'ok',
      completedAt: new Date('2026-10-13T00:01:00Z'),
      images: [
        {
          mediaId: 'm0',
          detectedPart: EPlantPart.LEAF,
          status: EDiagnosisImageStatus.DISEASED,
          diseases: [
            { diseaseCode: 'RICE_BLAST', variantCode: null, confidence },
          ],
          regions: [],
          b1Raw: { a: 1 },
          b3Raw: { b: 2 },
        },
        { plantPart: EPlantPart.PANICLE },
      ],
    });

    const restored = DiagnosisMapper.toDomain(
      DiagnosisMapper.toOrm(diagnosis),
      DiagnosisMapper.imagesToOrm(diagnosis),
    );

    expect(restored).toEqual(diagnosis);
    expect(DiagnosisMapper.imagesToOrm(diagnosis)[1]).toMatchObject({
      diagnosisId: diagnosis.id,
      sortOrder: 1,
      plantPart: EPlantPart.PANICLE,
    });
  });
});
