import { Inject, Injectable } from '@nestjs/common';
import { TKnowledgeDiagnosisCrop } from '@modules/knowledge/contracts';
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
  TVisionModels,
  TVisionProviderInfo,
} from '../../application/ports';
import {
  buildDescribeSystemPrompt,
  buildDescribeUserMessage,
  DESCRIBE_PROMPT_VERSION,
} from './prompts/describe.prompt';
import {
  buildVerifySystemPrompt,
  buildVerifyUserMessage,
  VERIFY_PROMPT_VERSION,
} from './prompts/verify.prompt';
import {
  buildDescribeOutputSchema,
  toDescribeResult,
} from './schemas/describe-output.schema';
import { verifyOutputSchema } from './schemas/verify-output.schema';
import { Semaphore } from './semaphore';

const LOW_TEMPERATURE = 0.2;

type TCropRequestParts = {
  describeSchema: ReturnType<typeof buildDescribeOutputSchema>;
  describeSystem: string;
  verifySystem: string;
};

/** The crop's configuration changes only with its KB version. */
function cropKey(crop: TKnowledgeDiagnosisCrop): string {
  return `${crop.code}@${crop.kbVersion}`;
}

/**
 * Low temperature for repeatable answers, except Gemini 3 models: Google recommends keeping
 * their default (1.0); lowering it can cause looping or degraded output.
 */
export function temperatureFor(model: string): number | undefined {
  return model.startsWith('gemini-3') ? undefined : LOW_TEMPERATURE;
}

/**
 * Vision steps through the shared AI client (provider + key from the `diagnosis` config, model per request);
 * schema and prompts are built from the crop's configuration and cached per crop and KB version.
 */
@Injectable()
export class AiVisionProvider implements IVisionDiagnosisProvider {
  private readonly client: IAiClient;
  private readonly limiter: Semaphore;
  /** Per `<crop>@<kbVersion>`: the crop's describe schema and system prompts. */
  private readonly perCrop = new Map<string, TCropRequestParts>();

  constructor(
    @Inject(AI_CLIENT_FACTORY) aiClients: IAiClientFactory,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
  ) {
    const { provider, apiKey, concurrency } = config.get('diagnosis');
    this.client = aiClients.create({ provider, apiKey });
    this.limiter = new Semaphore(concurrency);
  }

  info(
    crop: TKnowledgeDiagnosisCrop,
    models: TVisionModels,
  ): TVisionProviderInfo {
    const { provider } = this.config.get('diagnosis');
    return {
      provider,
      model: `${models.describeModel}+${models.verifyModel}`,
      promptVersion: `${DESCRIBE_PROMPT_VERSION}+${VERIFY_PROMPT_VERSION}/${cropKey(crop)}`,
    };
  }

  async describe(input: TDescribeInput): Promise<TDescribeOutput> {
    const parts = this.partsFor(input.crop);
    const { timeoutMs } = this.config.get('diagnosis');
    const { output, raw } = await this.limiter.run(() =>
      this.client.generateObject({
        model: input.model,
        system: parts.describeSystem,
        content: [
          { type: 'text', text: buildDescribeUserMessage(input) },
          {
            type: 'image',
            data: input.image.data,
            mimeType: input.image.mimeType,
          },
        ],
        schema: parts.describeSchema,
        temperature: temperatureFor(input.model),
        timeoutMs,
      }),
    );
    return { result: toDescribeResult(output, input.crop), raw };
  }

  async verify(input: TVerifyInput): Promise<TVerifyOutput> {
    const { timeoutMs } = this.config.get('diagnosis');
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
        model: input.model,
        system: this.partsFor(input.crop).verifySystem,
        content,
        schema: verifyOutputSchema(codes),
        temperature: temperatureFor(input.model),
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

  private partsFor(crop: TKnowledgeDiagnosisCrop): TCropRequestParts {
    const key = cropKey(crop);
    let parts = this.perCrop.get(key);
    if (!parts) {
      parts = {
        describeSchema: buildDescribeOutputSchema(crop),
        describeSystem: buildDescribeSystemPrompt(crop),
        verifySystem: buildVerifySystemPrompt(crop),
      };
      this.perCrop.set(key, parts);
    }
    return parts;
  }
}
