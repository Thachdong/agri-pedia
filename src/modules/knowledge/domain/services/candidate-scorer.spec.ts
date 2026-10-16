import { TScoringUnit } from '../disease-profile';
import { rawScore, scoreCandidates } from './candidate-scorer';

const blastV1: TScoringUnit = {
  diseaseCode: 'RICE_BLAST',
  variantCode: 'RICE_BLAST__V1',
  weights: {
    lesionShape: { SPINDLE_DIAMOND: 3, ROUND_OVAL: -1 },
    centerColor: { GRAY_WHITE: 2 },
    borderColor: { DARK_BROWN: 1 },
    halo: { YELLOW: -1 },
  },
};
const blastV2: TScoringUnit = {
  diseaseCode: 'RICE_BLAST',
  variantCode: 'RICE_BLAST__V2',
  weights: { centerColor: { GRAY_WHITE: 0, DARK_BROWN_BLACK: 2 } },
};
const brownSpot: TScoringUnit = {
  diseaseCode: 'RICE_BROWN_SPOT',
  variantCode: null,
  weights: {
    lesionShape: { ROUND_OVAL: 3, SPINDLE_DIAMOND: -1 },
    halo: { YELLOW: 2 },
    centerColor: { GRAY_WHITE: 1 },
  },
};
const tungro: TScoringUnit = {
  diseaseCode: 'RICE_TUNGRO',
  variantCode: null,
  weights: { discoloration: { YELLOW_ORANGE: 3 } },
};

describe('rawScore', () => {
  it('sums weights of observed values, ignoring UNSURE and unlisted values', () => {
    expect(
      rawScore(blastV1, {
        lesionShape: 'SPINDLE_DIAMOND',
        centerColor: 'GRAY_WHITE',
        borderColor: 'UNSURE',
        halo: 'NONE',
        size: 'SMALL_LT_2MM',
      }),
    ).toBe(5);
  });
});

describe('scoreCandidates', () => {
  const units = [blastV1, blastV2, brownSpot, tungro];

  it('ranks by raw, keeps the best variant per disease, drops raw <= 0', () => {
    const result = scoreCandidates(
      units,
      {
        lesionShape: 'SPINDLE_DIAMOND',
        centerColor: 'GRAY_WHITE',
        halo: 'NONE',
      },
      3,
    );

    expect(result.map((c) => [c.variantCode ?? c.diseaseCode, c.raw])).toEqual([
      ['RICE_BLAST__V1', 5],
    ]);
  });

  it('gives a softmax matchScore over every unit, dropped ones included', () => {
    const result = scoreCandidates(
      units,
      { lesionShape: 'ROUND_OVAL', halo: 'YELLOW', centerColor: 'GRAY_WHITE' },
      3,
    );

    // raws: brown spot 6, blast V1 0, blast V2 0, tungro 0
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ diseaseCode: 'RICE_BROWN_SPOT', raw: 6 });
    expect(result[0].matchScore).toBeCloseTo(
      Math.exp(6) / (Math.exp(6) + 3),
      10,
    );
  });

  it('limits the number of candidates', () => {
    const result = scoreCandidates(
      units,
      {
        lesionShape: 'SPINDLE_DIAMOND',
        centerColor: 'GRAY_WHITE',
        discoloration: 'YELLOW_ORANGE',
      },
      1,
    );
    expect(result).toHaveLength(1);
    expect(result[0].variantCode).toBe('RICE_BLAST__V1');
  });

  it('returns nothing without units', () => {
    expect(scoreCandidates([], { halo: 'YELLOW' }, 3)).toEqual([]);
  });
});
