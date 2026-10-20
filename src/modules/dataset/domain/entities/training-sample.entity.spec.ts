import { ELabelSource } from '../enums/label-source.enum';
import { TrainingSample } from './training-sample.entity';

describe('TrainingSample.create', () => {
  it('creates an AI_HIGH sample with an image key under the crop', () => {
    const sample = TrainingSample.create({
      diagnosisId: 'd1',
      sortOrder: 1,
      cropType: 'RICE',
      plantPart: 'LEAF',
      diseaseCode: 'RICE_BLAST',
      variantCode: null,
      confidenceScore: 0.9,
      regions: [{ box: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 }, score: 0.9 }],
      provider: 'GEMINI',
      model: 'm',
      promptVersion: 'p',
      kbVersion: 'k',
    });

    expect(sample.labelSource).toBe(ELabelSource.AI_HIGH);
    expect(sample.imageKey).toBe(`datasets/RICE/${sample.id}.jpg`);
    expect(sample.diagnosisId).toBe('d1');
    expect(sample.sortOrder).toBe(1);
    expect(sample.createdAt).toBeInstanceOf(Date);
  });
});
