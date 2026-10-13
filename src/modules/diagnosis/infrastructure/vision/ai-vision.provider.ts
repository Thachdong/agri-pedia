import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import {
  AI_CLIENT_FACTORY,
  IAiClient,
  IAiClientFactory,
  TAiContentPart,
} from '@shared/ai';
import {
  IVisionDiagnosisProvider,
  TDescribeInput,
  TDescribeOutput,
  TVerifyInput,
  TVerifyOutput,
  TVisionProviderInfo,
} from '../../application/ports';
import {
  buildDescribeUserMessage,
  DESCRIBE_PROMPT_VERSION,
  DESCRIBE_SYSTEM_PROMPT,
} from './prompts/describe.prompt';
import {
  buildVerifyUserMessage,
  VERIFY_PROMPT_VERSION,
  VERIFY_SYSTEM_PROMPT,
} from './prompts/verify.prompt';
import {
  describeOutputSchema,
  toDescribeResult,
} from './schemas/describe-output.schema';
import { verifyOutputSchema } from './schemas/verify-output.schema';
import { Semaphore } from './semaphore';

const LOW_TEMPERATURE = 0.2;

/**
 * Low temperature for repeatable answers, except Gemini 3 models: Google recommends keeping
 * their default (1.0); lowering it can cause looping or degraded output.
 */
export function temperatureFor(model: string): number | undefined {
  return model.startsWith('gemini-3') ? undefined : LOW_TEMPERATURE;
}

/** Vision steps through the shared AI client (provider + key + models from the `diagnosis` config). */
@Injectable()
export class AiVisionProvider implements IVisionDiagnosisProvider {
  private readonly client: IAiClient;
  private readonly limiter: Semaphore;

  constructor(
    @Inject(AI_CLIENT_FACTORY) aiClients: IAiClientFactory,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
  ) {
    const { provider, apiKey, concurrency } = config.get('diagnosis');
    this.client = aiClients.create({ provider, apiKey });
    this.limiter = new Semaphore(concurrency);
  }

  info(): TVisionProviderInfo {
    const { provider, describeModel, verifyModel } =
      this.config.get('diagnosis');
    return {
      provider,
      model: `${describeModel}+${verifyModel}`,
      promptVersion: `${DESCRIBE_PROMPT_VERSION}+${VERIFY_PROMPT_VERSION}`,
    };
  }

  async describe(input: TDescribeInput): Promise<TDescribeOutput> {
    const { describeModel, timeoutMs } = this.config.get('diagnosis');
    const { output, raw } = await this.limiter.run(() =>
      this.client.generateObject({
        model: describeModel,
        system: DESCRIBE_SYSTEM_PROMPT,
        content: [
          { type: 'text', text: buildDescribeUserMessage(input) },
          {
            type: 'image',
            data: input.image.data,
            mimeType: input.image.mimeType,
          },
        ],
        schema: describeOutputSchema,
        temperature: temperatureFor(describeModel),
        timeoutMs,
      }),
    );
    return { result: toDescribeResult(output), raw };
  }

  async verify(input: TVerifyInput): Promise<TVerifyOutput> {
    const { verifyModel, timeoutMs } = this.config.get('diagnosis');
    const codes = [
      ...new Set(input.regions.flatMap((region) => region.candidateCodes)),
    ];
    const content: TAiContentPart[] = [
      { type: 'text', text: buildVerifyUserMessage(input) },
      { type: 'text', text: 'Whole photo:' },
      {
        type: 'image',
        data: input.thumbnail.data,
        mimeType: input.thumbnail.mimeType,
      },
      ...input.regions.flatMap((region): TAiContentPart[] => [
        { type: 'text', text: `Region ${region.regionIndex} crop:` },
        {
          type: 'image',
          data: region.crop.data,
          mimeType: region.crop.mimeType,
        },
      ]),
    ];
    const { output, raw } = await this.limiter.run(() =>
      this.client.generateObject({
        model: verifyModel,
        system: VERIFY_SYSTEM_PROMPT,
        content,
        schema: verifyOutputSchema(codes),
        temperature: temperatureFor(verifyModel),
        timeoutMs,
      }),
    );
    return {
      regions: output.regions.map((region) => ({
        regionIndex: region.regionIndex,
        verdict: region.verdict,
        isLesion: region.isLesion,
        supportingFeatures: region.supportingFeatures,
        selfConfidence: region.selfConfidence,
      })),
      raw,
    };
  }
}
