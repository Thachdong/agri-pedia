/**
 * Observation enums a vision step fills in (per region / whole image) and the knowledge base scores.
 * Same values as the KB `profile.json` features; use them to build the vision output schema.
 */
export const KNOWLEDGE_OBSERVATION_FEATURES = {
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
  halo: { level: 'region', values: ['YELLOW', 'NONE', 'UNSURE'] },
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
  },
} as const;

export type TKnowledgeObservationFeature =
  keyof typeof KNOWLEDGE_OBSERVATION_FEATURES;

/** Observed value per feature; missing or `UNSURE` features are not scored. */
export type TKnowledgeObservation = Partial<
  Record<TKnowledgeObservationFeature, string>
>;
