import { TrainingSample } from '../../domain';
import { TrainingSampleMapper } from './training-sample.mapper';

describe('TrainingSampleMapper', () => {
  it('round-trips every field', () => {
    const sample = TrainingSample.create({
      diagnosisId: 'd1',
      sortOrder: 2,
      cropType: 'RICE',
      plantPart: 'LEAF',
      diseaseCode: 'RICE_BLAST',
      variantCode: 'RICE_BLAST__V1',
      confidenceScore: 0.87,
      regions: [{ box: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 }, score: 0.87 }],
      provider: 'GEMINI',
      model: 'm-describe+m-verify',
      promptVersion: 'd1+v1',
      kbVersion: '2026-10-12',
    });

    const restored = TrainingSampleMapper.toDomain(
      TrainingSampleMapper.toOrm(sample),
    );

    expect(restored).toEqual(sample);
  });
});
