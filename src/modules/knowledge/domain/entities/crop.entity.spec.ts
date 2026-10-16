import { ECropStage } from '../enums/crop-stage.enum';
import { EPlantPart } from '../enums/plant-part.enum';
import { Crop, TCropProps } from './crop.entity';

const props: TCropProps = {
  code: 'DURIAN',
  slug: 'sau-rieng',
  nameVi: 'Sầu riêng',
  nameEn: 'durian',
  enabled: false,
  kbVersion: '2026-10-15',
  sortOrder: 2,
  plantParts: [{ code: EPlantPart.FRUIT, nameVi: 'Trái', promptEn: 'fruit' }],
  cropStages: [{ code: ECropStage.FLOWERING, nameVi: 'Ra hoa' }],
  features: {
    plantForm: {
      level: 'image',
      values: ['NORMAL', 'TIP_DIEBACK', 'UNSURE'],
      normal: ['NORMAL'],
    },
  },
  prompt: { subjectEn: 'durian trees', wholeImageCuesEn: 'dieback' },
};

describe('Crop', () => {
  it('restores from persistence with its diagnosis configuration', () => {
    const crop = Crop.restore(props);

    expect(crop.code).toBe('DURIAN');
    expect(crop.slug).toBe('sau-rieng');
    expect(crop.nameVi).toBe('Sầu riêng');
    expect(crop.nameEn).toBe('durian');
    expect(crop.enabled).toBe(false);
    expect(crop.kbVersion).toBe('2026-10-15');
    expect(crop.sortOrder).toBe(2);
    expect(crop.plantParts).toEqual(props.plantParts);
    expect(crop.cropStages).toEqual(props.cropStages);
    expect(crop.features).toEqual(props.features);
    expect(crop.prompt).toEqual(props.prompt);
  });

  it('enable() returns the same crop enabled, leaving the original unchanged', () => {
    const crop = Crop.restore(props);

    const enabled = crop.enable();

    expect(enabled.enabled).toBe(true);
    expect(enabled.code).toBe('DURIAN');
    expect(enabled.features).toEqual(crop.features);
    expect(crop.enabled).toBe(false);
  });
});
