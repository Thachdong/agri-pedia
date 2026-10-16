import { EDiagnosisImageStatus } from '../enums/diagnosis-image-status.enum';
import {
  clampBox,
  isWholeImageAbnormal,
  prepareRegions,
  TDescribedRegion,
  TDescribeResult,
  TFeatureSpecs,
  wholeImageRegion,
} from './describe-regions';

/** Rice features (seed profile.json). */
const RICE: TFeatureSpecs = {
  lesionShape: {
    level: 'region',
    values: [
      'SPINDLE_DIAMOND',
      'ROUND_OVAL',
      'SHORT_NARROW_STREAK',
      'LONG_STREAK',
      'IRREGULAR_BLOTCH',
      'ZONATE_BANDED',
      'WHITE_SCRAPING',
      'TINY_DOTS',
      'NO_DISTINCT_LESION',
      'UNSURE',
    ],
  },
  centerColor: {
    level: 'region',
    values: [
      'GRAY_WHITE',
      'WHITE_SILVERY',
      'TAN',
      'BROWN',
      'REDDISH_BROWN',
      'DARK_BROWN_BLACK',
      'ORANGE',
      'YELLOW',
      'TRANSLUCENT_WATER_SOAKED',
      'NONE',
      'UNSURE',
    ],
  },
  borderColor: {
    level: 'region',
    values: ['DARK_BROWN', 'REDDISH_BROWN', 'YELLOW', 'NONE', 'UNSURE'],
  },
  margin: {
    level: 'region',
    values: ['SHARP', 'WAVY_IRREGULAR', 'DIFFUSE', 'UNSURE'],
  },
  halo: {
    level: 'region',
    values: ['YELLOW', 'NONE', 'UNSURE'],
  },
  size: {
    level: 'region',
    values: ['SMALL_LT_2MM', 'MEDIUM_2_10MM', 'LARGE_GT_10MM', 'UNSURE'],
  },
  distribution: {
    level: 'region',
    values: ['SINGLE', 'SCATTERED', 'MERGED_STRIPS', 'WHOLE_ORGAN', 'UNSURE'],
  },
  position: {
    level: 'region',
    values: [
      'LEAF_TIP',
      'LEAF_MARGIN',
      'ALONG_MIDRIB_OR_VEINS',
      'LEAF_BLADE',
      'LOWER_SHEATH',
      'UPPER_SHEATH',
      'NODE_OR_NECK',
      'GRAIN',
      'ROOT',
      'UNSURE',
    ],
  },
  sign: {
    level: 'region',
    values: [
      'NONE',
      'OOZE_DROPLETS',
      'SCLEROTIA',
      'MOLD_OR_POWDER',
      'SPORE_BALL',
      'GALL_SWELLING',
      'INSECT_OR_EGGS',
      'FRASS_OR_HOLE',
      'SILK_FOLD',
      'UNSURE',
    ],
  },
  deformation: {
    level: 'region',
    values: [
      'NONE',
      'FOLDED_ROLLED',
      'TWISTED_CRINKLED',
      'CUT_OR_CHEWED',
      'HOLLOW_TUBE',
      'DRIED_WITHERED',
      'SOFT_ROT',
      'UNSURE',
    ],
  },
  discoloration: {
    level: 'image',
    values: [
      'YELLOW_ORANGE',
      'PALE_YELLOW_GREEN',
      'DARK_GREEN',
      'REDDISH_BRONZE',
      'WHITE_TIPS',
      'NONE',
      'UNSURE',
    ],
    normal: ['NONE'],
  },
  plantForm: {
    level: 'image',
    values: [
      'NORMAL',
      'STUNTED',
      'ABNORMALLY_TALL',
      'EXCESS_TILLERS_GRASSY',
      'LODGED_BROKEN',
      'DEADHEART',
      'MISSING_OR_CUT_HILLS',
      'UNSURE',
    ],
    normal: ['NORMAL'],
  },
  panicle: {
    level: 'image',
    values: [
      'NOT_VISIBLE',
      'NORMAL',
      'EMPTY_ERECT_WHITE',
      'DISCOLORED_GRAINS',
      'NOT_FULLY_EMERGED',
      'BROKEN_NECK',
      'UNSURE',
    ],
    normal: ['NOT_VISIBLE', 'NORMAL'],
  },
  pestsVisible: {
    level: 'image',
    values: [
      'NONE',
      'PLANTHOPPER',
      'LEAFHOPPER',
      'CATERPILLAR',
      'BEETLE',
      'BUG',
      'SNAIL_OR_EGGS',
      'OTHER',
      'UNSURE',
    ],
    normal: ['NONE'],
  },
};

/** Durian-like crop: different image features (fruit instead of panicle). */
const DURIAN: TFeatureSpecs = {
  lesionShape: {
    level: 'region',
    values: ['BARK_PATCH_CANKER', 'NO_DISTINCT_LESION', 'UNSURE'],
  },
  distribution: {
    level: 'region',
    values: ['SINGLE', 'WHOLE_ORGAN', 'UNSURE'],
  },
  sign: { level: 'region', values: ['GUM_OOZE', 'NONE', 'UNSURE'] },
  plantForm: {
    level: 'image',
    values: ['NORMAL', 'TIP_DIEBACK', 'UNSURE'],
    normal: ['NORMAL'],
  },
  fruit: {
    level: 'image',
    values: ['NOT_VISIBLE', 'NORMAL', 'HUSK_ROT', 'UNSURE'],
    normal: ['NOT_VISIBLE', 'NORMAL'],
  },
};

/** isWholeImageAbnormal before features were per crop (rice field names hard-coded). */
function riceHardCoded(wholeImage: Record<string, string>): boolean {
  const { discoloration, plantForm, panicle, pestsVisible } = wholeImage;
  return (
    (discoloration !== undefined &&
      !['NONE', 'UNSURE'].includes(discoloration)) ||
    (plantForm !== undefined && !['NORMAL', 'UNSURE'].includes(plantForm)) ||
    (panicle !== undefined &&
      [
        'EMPTY_ERECT_WHITE',
        'DISCOLORED_GRAINS',
        'NOT_FULLY_EMERGED',
        'BROKEN_NECK',
      ].includes(panicle)) ||
    (pestsVisible !== undefined && !['NONE', 'UNSURE'].includes(pestsVisible))
  );
}

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
  it('flags an image feature outside its normal values', () => {
    expect(
      isWholeImageAbnormal(
        { discoloration: 'NONE', plantForm: 'NORMAL' },
        RICE,
      ),
    ).toBe(false);
    expect(
      isWholeImageAbnormal(
        {
          discoloration: 'UNSURE',
          plantForm: 'UNSURE',
          panicle: 'NOT_VISIBLE',
          pestsVisible: 'UNSURE',
        },
        RICE,
      ),
    ).toBe(false);
    expect(isWholeImageAbnormal({ discoloration: 'YELLOW_ORANGE' }, RICE)).toBe(
      true,
    );
    expect(isWholeImageAbnormal({ plantForm: 'STUNTED' }, RICE)).toBe(true);
    expect(isWholeImageAbnormal({ panicle: 'BROKEN_NECK' }, RICE)).toBe(true);
    expect(isWholeImageAbnormal({ pestsVisible: 'PLANTHOPPER' }, RICE)).toBe(
      true,
    );
  });

  it('gives the same answer as the hard-coded rice rules for every combination of rice image values', () => {
    const values = (name: string) => [...RICE[name].values, undefined];
    for (const discoloration of values('discoloration'))
      for (const plantForm of values('plantForm'))
        for (const panicle of values('panicle'))
          for (const pestsVisible of values('pestsVisible')) {
            const wholeImage = Object.fromEntries(
              Object.entries({
                discoloration,
                plantForm,
                panicle,
                pestsVisible,
              }).filter(([, value]) => value !== undefined),
            );
            expect(isWholeImageAbnormal(wholeImage, RICE)).toBe(
              riceHardCoded(wholeImage),
            );
          }
  });

  it("uses the crop's own image features and ignores unknown or region ones", () => {
    expect(isWholeImageAbnormal({ fruit: 'HUSK_ROT' }, DURIAN)).toBe(true);
    expect(isWholeImageAbnormal({ fruit: 'NORMAL' }, DURIAN)).toBe(false);
    expect(isWholeImageAbnormal({ panicle: 'BROKEN_NECK' }, DURIAN)).toBe(
      false,
    );
    expect(isWholeImageAbnormal({ sign: 'GUM_OOZE' }, DURIAN)).toBe(false);
  });
});

describe('wholeImageRegion', () => {
  it('covers the image, every other region feature of the crop UNSURE', () => {
    expect(wholeImageRegion(DURIAN).observations).toEqual({
      lesionShape: 'NO_DISTINCT_LESION',
      distribution: 'WHOLE_ORGAN',
      sign: 'UNSURE',
    });
    expect(wholeImageRegion(RICE).observations).toEqual({
      lesionShape: 'NO_DISTINCT_LESION',
      distribution: 'WHOLE_ORGAN',
      centerColor: 'UNSURE',
      borderColor: 'UNSURE',
      margin: 'UNSURE',
      halo: 'UNSURE',
      size: 'UNSURE',
      position: 'UNSURE',
      sign: 'UNSURE',
      deformation: 'UNSURE',
    });
  });
});

describe('prepareRegions', () => {
  it('stops images that are not the crop or not good quality', () => {
    expect(prepareRegions(result({ isTargetCrop: 'NO' }), 5, RICE)).toEqual({
      status: EDiagnosisImageStatus.NOT_TARGET_CROP,
      regions: [],
    });
    expect(prepareRegions(result({ quality: 'BLURRY' }), 5, RICE)).toEqual({
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
      RICE,
    );
    expect(outcome.status).toBeNull();
    expect(outcome.regions.map((r) => r.box.x)).toEqual([0.1, 0.2]);
  });

  it('is HEALTHY without regions on a normal-looking image', () => {
    expect(prepareRegions(result({ regions: [] }), 5, RICE)).toEqual({
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
      RICE,
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
