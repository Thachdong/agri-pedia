import { selectTrainingImage, TCandidateImage } from './select-training-image';

const box = { x: 0.1, y: 0.2, w: 0.3, h: 0.4 };

const image = (overrides: Partial<TCandidateImage> = {}): TCandidateImage => ({
  sortOrder: 0,
  key: 'diagnoses/d1/m1.jpg',
  diseases: [
    { diseaseCode: 'RICE_BLAST', variantCode: 'V1', level: 'HIGH', score: 0.9 },
  ],
  regions: [{ box, diseaseCode: 'RICE_BLAST', level: 'HIGH', score: 0.9 }],
  ...overrides,
});

describe('selectTrainingImage', () => {
  it('keeps an image with one HIGH disease and its HIGH regions', () => {
    const other = { x: 0.5, y: 0.5, w: 0.1, h: 0.1 };
    expect(
      selectTrainingImage(
        image({
          regions: [
            { box, diseaseCode: 'RICE_BLAST', level: 'HIGH', score: 0.9 },
            {
              box: other,
              diseaseCode: 'RICE_BLAST',
              level: 'MEDIUM',
              score: 0.5,
            },
          ],
        }),
        false,
      ),
    ).toEqual({
      sortOrder: 0,
      key: 'diagnoses/d1/m1.jpg',
      diseaseCode: 'RICE_BLAST',
      variantCode: 'V1',
      score: 0.9,
      regions: [{ box, score: 0.9 }],
    });
  });

  it('drops the image when the diagnosis has a conflict', () => {
    expect(selectTrainingImage(image(), true)).toBeNull();
  });

  it('drops an image that was not stored', () => {
    expect(selectTrainingImage(image({ key: null }), false)).toBeNull();
  });

  it('drops an image without disease or with several diseases', () => {
    expect(selectTrainingImage(image({ diseases: [] }), false)).toBeNull();
    expect(
      selectTrainingImage(
        image({
          diseases: [
            {
              diseaseCode: 'RICE_BLAST',
              variantCode: null,
              level: 'HIGH',
              score: 0.9,
            },
            {
              diseaseCode: 'RICE_BLB',
              variantCode: null,
              level: 'MEDIUM',
              score: 0.5,
            },
          ],
        }),
        false,
      ),
    ).toBeNull();
  });

  it('drops an image whose disease is not HIGH', () => {
    expect(
      selectTrainingImage(
        image({
          diseases: [
            {
              diseaseCode: 'RICE_BLAST',
              variantCode: null,
              level: 'MEDIUM',
              score: 0.6,
            },
          ],
        }),
        false,
      ),
    ).toBeNull();
  });

  it('drops an image with an uncertain region', () => {
    expect(
      selectTrainingImage(
        image({
          regions: [
            { box, diseaseCode: 'RICE_BLAST', level: 'HIGH', score: 0.9 },
            { box, diseaseCode: null, level: null, score: null },
          ],
        }),
        false,
      ),
    ).toBeNull();
  });

  it('drops an image without a HIGH region of its disease', () => {
    expect(
      selectTrainingImage(
        image({
          regions: [
            { box, diseaseCode: 'RICE_BLAST', level: 'MEDIUM', score: 0.6 },
          ],
        }),
        false,
      ),
    ).toBeNull();
  });
});
