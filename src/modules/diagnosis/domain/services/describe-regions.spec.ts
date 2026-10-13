import { EDiagnosisImageStatus } from '../enums/diagnosis-image-status.enum';
import {
  clampBox,
  isWholeImageAbnormal,
  prepareRegions,
  TDescribedRegion,
  TDescribeResult,
} from './describe-regions';

const region = (box: TDescribedRegion['box']): TDescribedRegion => ({
  box,
  observations: { lesionShape: 'SPINDLE_DIAMOND' },
  descriptionEn: 'spot',
  descriptionVi: 'vết',
});

const result = (overrides: Partial<TDescribeResult> = {}): TDescribeResult => ({
  isTargetCrop: 'YES',
  quality: 'GOOD',
  detectedPart: 'LEAF',
  wholeImage: {
    discoloration: 'NONE',
    plantForm: 'NORMAL',
    panicle: 'NOT_VISIBLE',
    pestsVisible: 'NONE',
  },
  regions: [region({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 })],
  ...overrides,
});

describe('clampBox', () => {
  it('keeps a box inside the image and cuts one crossing the edge', () => {
    expect(clampBox({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 })).toEqual({
      x: 0.1,
      y: 0.2,
      w: 0.3,
      h: 0.4,
    });
    const cut = clampBox({ x: 0.8, y: 0.9, w: 0.5, h: 0.5 });
    expect(cut?.w).toBeCloseTo(0.2);
    expect(cut?.h).toBeCloseTo(0.1);
  });

  it('drops boxes outside 0..1, with empty size, or at the far edge', () => {
    expect(clampBox({ x: -0.1, y: 0, w: 0.2, h: 0.2 })).toBeNull();
    expect(clampBox({ x: 0, y: 1.2, w: 0.2, h: 0.2 })).toBeNull();
    expect(clampBox({ x: 0, y: 0, w: 0, h: 0.2 })).toBeNull();
    expect(clampBox({ x: 1, y: 0, w: 0.2, h: 0.2 })).toBeNull();
    expect(clampBox({ x: NaN, y: 0, w: 0.2, h: 0.2 })).toBeNull();
  });
});

describe('isWholeImageAbnormal', () => {
  it('flags discoloration, plant form, panicle or pests', () => {
    expect(
      isWholeImageAbnormal({ discoloration: 'NONE', plantForm: 'NORMAL' }),
    ).toBe(false);
    expect(
      isWholeImageAbnormal({
        discoloration: 'UNSURE',
        plantForm: 'UNSURE',
        panicle: 'NORMAL',
        pestsVisible: 'UNSURE',
      }),
    ).toBe(false);
    expect(isWholeImageAbnormal({ discoloration: 'YELLOW_ORANGE' })).toBe(true);
    expect(isWholeImageAbnormal({ plantForm: 'STUNTED' })).toBe(true);
    expect(isWholeImageAbnormal({ panicle: 'BROKEN_NECK' })).toBe(true);
    expect(isWholeImageAbnormal({ pestsVisible: 'PLANTHOPPER' })).toBe(true);
  });
});

describe('prepareRegions', () => {
  it('stops images that are not the crop or not good quality', () => {
    expect(prepareRegions(result({ isTargetCrop: 'NO' }), 5)).toEqual({
      status: EDiagnosisImageStatus.NOT_TARGET_CROP,
      regions: [],
    });
    expect(prepareRegions(result({ quality: 'BLURRY' }), 5)).toEqual({
      status: EDiagnosisImageStatus.LOW_QUALITY,
      regions: [],
    });
  });

  it('goes on when the crop is UNSURE, keeping valid regions up to the limit', () => {
    const outcome = prepareRegions(
      result({
        isTargetCrop: 'UNSURE',
        regions: [
          region({ x: 2, y: 0, w: 0.1, h: 0.1 }),
          region({ x: 0.1, y: 0.1, w: 0.1, h: 0.1 }),
          region({ x: 0.2, y: 0.2, w: 0.1, h: 0.1 }),
          region({ x: 0.3, y: 0.3, w: 0.1, h: 0.1 }),
        ],
      }),
      2,
    );
    expect(outcome.status).toBeNull();
    expect(outcome.regions.map((r) => r.box.x)).toEqual([0.1, 0.2]);
  });

  it('is HEALTHY without regions on a normal-looking image', () => {
    expect(prepareRegions(result({ regions: [] }), 5)).toEqual({
      status: EDiagnosisImageStatus.HEALTHY,
      regions: [],
    });
  });

  it('adds a whole-image region when the whole image looks abnormal', () => {
    const outcome = prepareRegions(
      result({
        regions: [],
        wholeImage: { discoloration: 'YELLOW_ORANGE', plantForm: 'STUNTED' },
      }),
      5,
    );
    expect(outcome.status).toBeNull();
    expect(outcome.regions).toHaveLength(1);
    expect(outcome.regions[0].box).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    expect(outcome.regions[0].observations).toMatchObject({
      lesionShape: 'NO_DISTINCT_LESION',
      distribution: 'WHOLE_ORGAN',
      centerColor: 'UNSURE',
      deformation: 'UNSURE',
    });
  });
});
