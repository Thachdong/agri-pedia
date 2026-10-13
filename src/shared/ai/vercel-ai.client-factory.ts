import { Injectable } from '@nestjs/common';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  FlexibleSchema,
  generateText,
  LanguageModel,
  NoObjectGeneratedError,
  Output,
} from 'ai';
import {
  AiGenerationError,
  EAiErrorKind,
  IAiClient,
  IAiClientFactory,
  TAiClientOptions,
  TAiGenerateObjectInput,
  TAiGenerateObjectResult,
  TAiProvider,
} from './ai.interface';

type TModelResolver = (modelId: string) => LanguageModel;

function parseRaw(text: string | undefined): unknown {
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class VercelAiClient implements IAiClient {
  constructor(private readonly resolveModel: TModelResolver) {}

  async generateObject<T>(
    input: TAiGenerateObjectInput<T>,
  ): Promise<TAiGenerateObjectResult<T>> {
    try {
      const result = await generateText({
        model: this.resolveModel(input.model),
        system: input.system,
        messages: [
          {
            role: 'user',
            content: input.content.map((part) =>
              part.type === 'text'
                ? { type: 'text' as const, text: part.text }
                : {
                    type: 'image' as const,
                    image: part.data,
                    mediaType: part.mimeType,
                  },
            ),
          },
        ],
        // Cast: the SDK's generic schema inference on a ZodType<T> recurses too deep for tsc.
        output: Output.object({
          schema: input.schema as unknown as FlexibleSchema<T>,
        }),
        temperature: input.temperature,
        timeout: input.timeoutMs,
        maxRetries: 0,
      });
      return { output: result.output, raw: parseRaw(result.text) };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        throw new AiGenerationError(
          EAiErrorKind.INVALID_OUTPUT,
          error.message,
          parseRaw(error.text),
        );
      }
      throw new AiGenerationError(
        EAiErrorKind.REQUEST,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

/** Vercel AI SDK adapter: one SDK for every provider, each provider package resolves its model ids. */
@Injectable()
export class VercelAiClientFactory implements IAiClientFactory {
  create(options: TAiClientOptions): IAiClient {
    return new VercelAiClient(this.modelResolver(options.provider, options));
  }

  private modelResolver(
    provider: TAiProvider,
    options: TAiClientOptions,
  ): TModelResolver {
    switch (provider) {
      case 'GEMINI': {
        const google = createGoogleGenerativeAI({ apiKey: options.apiKey });
        return (modelId) => google(modelId);
      }
    }
  }
}
