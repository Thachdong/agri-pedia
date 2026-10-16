import { TKnowledgeDiagnosisCrop } from '@modules/knowledge/contracts';
import { IConfigService } from '@shared/config';
import { IAiClient, InMemoryAiClientFactory } from '@shared/ai';
import { buildDiagnosisCrop } from '../../application/ports/fakes';
import { EConfidenceLevel, EPlantPart } from '../../domain';
import { AiVisionProvider, temperatureFor } from './ai-vision.provider';
import { buildDescribeSystemPrompt } from './prompts/describe.prompt';
import { buildVerifySystemPrompt } from './prompts/verify.prompt';
import { verifyOutputSchema } from './schemas/verify-output.schema';
import { buildDescribeOutputSchema } from './schemas/describe-output.schema';

const config = {
  get: () => ({
    provider: 'GEMINI',
    apiKey: 'key',
    describeModel: 'gemini-3-flash-preview',
    verifyModel: 'gemini-2.5-flash',
    timeoutMs: 1000,
    concurrency: 2,
  }),
} as unknown as IConfigService;

const jpeg = (content: string) => ({
  data: Buffer.from(content),
  mimeType: 'image/jpeg' as const,
  width: 100,
  height: 100,
});

const rice = buildDiagnosisCrop({
  features: {
    ...buildDiagnosisCrop().features,
    halo: {
      level: 'region',
      values: ['YELLOW', 'NONE', 'UNSURE'],
      descriptionEn: 'a yellow zone around the lesion',
    },
    panicle: {
      level: 'image',
      values: ['NOT_VISIBLE', 'NORMAL', 'BROKEN_NECK', 'UNSURE'],
      normal: ['NOT_VISIBLE', 'NORMAL'],
      descriptionEn: 'panicles',
    },
  },
});

const durian: TKnowledgeDiagnosisCrop = buildDiagnosisCrop({
  code: 'DURIAN',
  nameEn: 'durian',
  kbVersion: '2026-10-15',
  plantParts: [
    { code: 'TRUNK', promptEn: 'trunk' },
    { code: 'FRUIT', promptEn: 'fruit (husk)' },
  ],
  features: {
    lesionShape: {
      level: 'region',
      values: ['BARK_PATCH_CANKER', 'NO_DISTINCT_LESION', 'UNSURE'],
      hintsEn: { BARK_PATCH_CANKER: 'dark patch of bark' },
    },
    distribution: {
      level: 'region',
      values: ['SINGLE', 'WHOLE_ORGAN', 'UNSURE'],
    },
    fruit: {
      level: 'image',
      values: ['NOT_VISIBLE', 'NORMAL', 'HUSK_ROT', 'UNSURE'],
      normal: ['NOT_VISIBLE', 'NORMAL'],
      descriptionEn: 'fruits',
    },
  },
  prompt: {
    subjectEn: 'durian trees (Durio zibethinus)',
    wholeImageCuesEn: 'dieback from branch tips',
  },
});

const describeAnswer = {
  isTargetCrop: 'YES',
  quality: 'GOOD',
  detectedPart: 'LEAF',
  wholeImage: { plantForm: 'NORMAL', panicle: 'NOT_VISIBLE' },
  regions: [
    {
      box_2d: [400, 300, 520, 380],
      lesionShape: 'SPINDLE_DIAMOND',
      distribution: 'SCATTERED',
      halo: 'NONE',
      descriptionEn: 'spindle lesion',
      descriptionVi: 'vết hình thoi',
    },
  ],
};

describe('AiVisionProvider', () => {
  let ai: InMemoryAiClientFactory;
  let provider: AiVisionProvider;

  beforeEach(() => {
    ai = new InMemoryAiClientFactory();
    provider = new AiVisionProvider(ai, config);
  });

  it('uses the configured provider and key, and reports models and the per-crop prompt version', () => {
    expect(ai.created).toEqual([{ provider: 'GEMINI', apiKey: 'key' }]);
    expect(provider.info(rice)).toEqual({
      provider: 'GEMINI',
      model: 'gemini-3-flash-preview+gemini-2.5-flash',
      promptVersion: 'd2+v2/RICE@2026-10-12',
    });
    expect(provider.info(durian).promptVersion).toBe('d2+v2/DURIAN@2026-10-15');
  });

  it("describes one image with the crop's prompt and schema, converting box_2d to a top-left box", async () => {
    ai.enqueue({ output: describeAnswer, raw: { text: 'raw' } });

    const result = await provider.describe({
      image: jpeg('img'),
      crop: rice,
      plantPart: EPlantPart.PANICLE,
      maxRegions: 5,
    });

    const request = ai.requests[0];
    expect(request).toMatchObject({
      model: 'gemini-3-flash-preview',
      system: buildDescribeSystemPrompt(rice),
      temperature: undefined,
      timeoutMs: 1000,
    });
    const text = (request.content[0] as { text: string }).text;
    expect(text).toContain('Crop: rice (RICE).');
    expect(text).toContain('at most 5 regions');
    expect(text).toContain('panicle / grains');
    expect(request.content[1]).toEqual({
      type: 'image',
      data: Buffer.from('img'),
      mimeType: 'image/jpeg',
    });
    expect(request.schema.safeParse(describeAnswer).success).toBe(true);
    expect(result.raw).toEqual({ text: 'raw' });
    expect(result.result.regions[0].box.x).toBeCloseTo(0.3);
    expect(result.result.regions[0].box.y).toBeCloseTo(0.4);
    expect(result.result.regions[0].box.w).toBeCloseTo(0.08);
    expect(result.result.regions[0].box.h).toBeCloseTo(0.12);
    expect(result.result.regions[0].observations).toEqual({
      lesionShape: 'SPINDLE_DIAMOND',
      distribution: 'SCATTERED',
      halo: 'NONE',
    });
    expect(result.result.wholeImage).toEqual({
      plantForm: 'NORMAL',
      panicle: 'NOT_VISIBLE',
    });
  });

  it('builds the schema and prompts once per crop and KB version', async () => {
    ai.enqueue({ output: describeAnswer, raw: null });
    ai.enqueue({ output: describeAnswer, raw: null });
    const input = {
      image: jpeg('i'),
      crop: rice,
      plantPart: null,
      maxRegions: 5,
    };

    await provider.describe(input);
    await provider.describe({ ...input, crop: { ...rice } });

    expect(ai.requests[1].schema).toBe(ai.requests[0].schema);
    expect((ai.requests[1].content[0] as { text: string }).text).toContain(
      'did not say which plant part',
    );
  });

  it('verifies with the thumbnail and labelled crops, limiting verdicts to the candidates', async () => {
    ai.enqueue({
      output: {
        regions: [
          {
            regionIndex: 2,
            isLesion: true,
            verdict: 'RICE_BLAST__V1',
            supportingFeatures: ['vết hình thoi'],
            selfConfidence: 'HIGH',
          },
        ],
      },
    });

    const result = await provider.verify({
      crop: rice,
      thumbnail: jpeg('thumb'),
      regions: [
        {
          regionIndex: 2,
          crop: jpeg('crop2'),
          observations: { lesionShape: 'SPINDLE_DIAMOND' },
          descriptionEn: 'spindle lesion',
          candidateCodes: ['RICE_BLAST__V1', 'RICE_BROWN_SPOT'],
        },
      ],
      cards: [
        {
          code: 'RICE_BLAST__V1',
          name: 'Leaf Blast',
          symptoms: ['spindle'],
          visualKeywords: [],
          distinguishFrom: [],
        },
      ],
    });

    const request = ai.requests[0];
    expect(request).toMatchObject({
      model: 'gemini-2.5-flash',
      system: buildVerifySystemPrompt(rice),
      temperature: 0.2,
    });
    expect(
      request.content.map((p) =>
        p.type === 'text' ? p.text.split('\n')[0] : p.data.toString(),
      ),
    ).toEqual(['Regions:', 'Whole photo:', 'thumb', 'Region 2 crop:', 'crop2']);
    expect(
      request.schema.safeParse({
        regions: [
          {
            regionIndex: 2,
            isLesion: true,
            verdict: 'RICE_TUNGRO',
            supportingFeatures: [],
            selfConfidence: 'HIGH',
          },
        ],
      }).success,
    ).toBe(false);
    expect(result.regions).toEqual([
      {
        regionIndex: 2,
        verdict: 'RICE_BLAST__V1',
        isLesion: true,
        supportingFeatures: ['vết hình thoi'],
        selfConfidence: EConfidenceLevel.HIGH,
      },
    ]);
  });

  it('runs at most `concurrency` AI requests at once', async () => {
    let running = 0;
    let peak = 0;
    const slowFactory = {
      create: (): IAiClient => ({
        generateObject: async () => {
          running += 1;
          peak = Math.max(peak, running);
          await new Promise((r) => setTimeout(r, 10));
          running -= 1;
          return { output: describeAnswer as never, raw: null };
        },
      }),
    };
    const limited = new AiVisionProvider(slowFactory, config);
    const input = {
      image: jpeg('i'),
      crop: rice,
      plantPart: null,
      maxRegions: 5,
    };

    await Promise.all([1, 2, 3, 4, 5].map(() => limited.describe(input)));

    expect(peak).toBe(2);
  });
});

describe('vision schemas', () => {
  it("build the describe schema from the crop's parts and features", () => {
    const riceSchema = buildDescribeOutputSchema(rice);
    expect(riceSchema.safeParse(describeAnswer).success).toBe(true);
    expect(
      riceSchema.safeParse({
        ...describeAnswer,
        regions: [{ ...describeAnswer.regions[0], halo: 'PURPLE' }],
      }).success,
    ).toBe(false);
    expect(
      riceSchema.safeParse({ ...describeAnswer, detectedPart: 'TRUNK' })
        .success,
    ).toBe(false);

    const durianSchema = buildDescribeOutputSchema(durian);
    const durianAnswer = {
      ...describeAnswer,
      detectedPart: 'TRUNK',
      wholeImage: { fruit: 'HUSK_ROT' },
      regions: [
        {
          box_2d: [0, 0, 1000, 1000],
          lesionShape: 'BARK_PATCH_CANKER',
          distribution: 'SINGLE',
          descriptionEn: 'dark bark patch',
          descriptionVi: 'mảng vỏ thâm',
        },
      ],
    };
    expect(durianSchema.safeParse(durianAnswer).success).toBe(true);
    expect(durianSchema.safeParse(describeAnswer).success).toBe(false);
  });

  it('build the verify enum from the request codes', () => {
    const schema = verifyOutputSchema(['A']);
    const answer = (verdict: string) => ({
      regions: [
        {
          regionIndex: 0,
          isLesion: true,
          verdict,
          supportingFeatures: [],
          selfConfidence: 'LOW',
        },
      ],
    });
    expect(schema.safeParse(answer('A')).success).toBe(true);
    expect(schema.safeParse(answer('NONE')).success).toBe(true);
    expect(schema.safeParse(answer('B')).success).toBe(false);
  });
});

describe('vision prompts', () => {
  it('fill the describe system prompt from the crop configuration', () => {
    expect(buildDescribeSystemPrompt(rice)).toMatchSnapshot();
    expect(buildDescribeSystemPrompt(durian)).toMatchSnapshot();
  });

  it('name the crop in the verify system prompt', () => {
    expect(buildVerifySystemPrompt(durian)).toMatch(
      /^You are a plant health specialist for durian trees \(Durio zibethinus\),/,
    );
  });
});

describe('temperatureFor', () => {
  it('keeps the provider default for Gemini 3 models only', () => {
    expect(temperatureFor('gemini-3-flash-preview')).toBeUndefined();
    expect(temperatureFor('gemini-2.5-flash')).toBe(0.2);
  });
});
