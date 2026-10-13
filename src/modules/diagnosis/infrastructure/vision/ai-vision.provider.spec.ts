import { IConfigService } from '@shared/config';
import { IAiClient, InMemoryAiClientFactory } from '@shared/ai';
import { EConfidenceLevel, EPlantPart } from '../../domain';
import { AiVisionProvider, temperatureFor } from './ai-vision.provider';
import { DESCRIBE_SYSTEM_PROMPT } from './prompts/describe.prompt';
import { VERIFY_SYSTEM_PROMPT } from './prompts/verify.prompt';
import { verifyOutputSchema } from './schemas/verify-output.schema';
import { describeOutputSchema } from './schemas/describe-output.schema';

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

const describeAnswer = {
  isTargetCrop: 'YES',
  quality: 'GOOD',
  detectedPart: 'LEAF',
  wholeImage: {
    discoloration: 'NONE',
    plantForm: 'NORMAL',
    panicle: 'NOT_VISIBLE',
    pestsVisible: 'NONE',
  },
  regions: [
    {
      box_2d: [400, 300, 520, 380],
      lesionShape: 'SPINDLE_DIAMOND',
      centerColor: 'GRAY_WHITE',
      borderColor: 'DARK_BROWN',
      margin: 'SHARP',
      halo: 'NONE',
      size: 'MEDIUM_2_10MM',
      distribution: 'SCATTERED',
      position: 'LEAF_BLADE',
      sign: 'NONE',
      deformation: 'NONE',
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

  it('uses the configured provider and key, and reports models and prompt versions', () => {
    expect(ai.created).toEqual([{ provider: 'GEMINI', apiKey: 'key' }]);
    expect(provider.info()).toEqual({
      provider: 'GEMINI',
      model: 'gemini-3-flash-preview+gemini-2.5-flash',
      promptVersion: 'd1+v1',
    });
  });

  it('describes one image and converts box_2d to a top-left box', async () => {
    ai.enqueue({ output: describeAnswer, raw: { text: 'raw' } });

    const result = await provider.describe({
      image: jpeg('img'),
      cropType: 'RICE',
      plantPart: EPlantPart.LEAF,
      maxRegions: 5,
    });

    const request = ai.requests[0];
    expect(request).toMatchObject({
      model: 'gemini-3-flash-preview',
      system: DESCRIBE_SYSTEM_PROMPT,
      temperature: undefined,
      timeoutMs: 1000,
    });
    expect(request.content[0]).toMatchObject({ type: 'text' });
    expect((request.content[0] as { text: string }).text).toContain(
      'at most 5 regions',
    );
    expect((request.content[0] as { text: string }).text).toContain('leaf');
    expect(request.content[1]).toEqual({
      type: 'image',
      data: Buffer.from('img'),
      mimeType: 'image/jpeg',
    });
    expect(result.raw).toEqual({ text: 'raw' });
    expect(result.result.regions[0].box.x).toBeCloseTo(0.3);
    expect(result.result.regions[0].box.y).toBeCloseTo(0.4);
    expect(result.result.regions[0].box.w).toBeCloseTo(0.08);
    expect(result.result.regions[0].box.h).toBeCloseTo(0.12);
    expect(result.result.regions[0].observations).toMatchObject({
      lesionShape: 'SPINDLE_DIAMOND',
      halo: 'NONE',
    });
    expect(result.result.regions[0].observations).not.toHaveProperty('box_2d');
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
      system: VERIFY_SYSTEM_PROMPT,
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
      cropType: 'RICE',
      plantPart: null,
      maxRegions: 5,
    };

    await Promise.all([1, 2, 3, 4, 5].map(() => limited.describe(input)));

    expect(peak).toBe(2);
  });
});

describe('vision schemas', () => {
  it('accept a valid describe answer and reject unknown enum values', () => {
    expect(describeOutputSchema.safeParse(describeAnswer).success).toBe(true);
    expect(
      describeOutputSchema.safeParse({
        ...describeAnswer,
        regions: [{ ...describeAnswer.regions[0], halo: 'PURPLE' }],
      }).success,
    ).toBe(false);
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

describe('temperatureFor', () => {
  it('keeps the provider default for Gemini 3 models only', () => {
    expect(temperatureFor('gemini-3-flash-preview')).toBeUndefined();
    expect(temperatureFor('gemini-2.5-flash')).toBe(0.2);
  });
});
