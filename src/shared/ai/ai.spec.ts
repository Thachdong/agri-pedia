import { MockLanguageModelV3 } from 'ai/test';
import { z } from 'zod';
import { AiGenerationError, EAiErrorKind } from './ai.interface';
import { InMemoryAiClientFactory } from './in-memory.ai-client-factory';
import { VercelAiClient } from './vercel-ai.client-factory';

const schema = z.object({ label: z.enum(['A', 'B']) });

function modelAnswering(text: string) {
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: 'text', text }],
      finishReason: { unified: 'stop', raw: 'STOP' },
      usage: {
        inputTokens: {
          total: 1,
          noCache: 1,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: { total: 1, text: 1, reasoning: undefined },
      },
      warnings: [],
    }),
  });
}

const input = {
  model: 'm1',
  system: 'sys',
  content: [
    { type: 'text' as const, text: 'look' },
    {
      type: 'image' as const,
      data: Buffer.from('jpeg'),
      mimeType: 'image/jpeg',
    },
  ],
  schema,
  temperature: 0,
  timeoutMs: 1000,
};

describe('VercelAiClient.generateObject', () => {
  it('returns the parsed object and raw JSON', async () => {
    const model = modelAnswering('{"label":"A"}');
    const client = new VercelAiClient(() => model);

    const result = await client.generateObject(input);

    expect(result).toEqual({ output: { label: 'A' }, raw: { label: 'A' } });
    const call = model.doGenerateCalls[0];
    expect(call.responseFormat).toMatchObject({ type: 'json' });
    expect(call.prompt[0]).toMatchObject({ role: 'system', content: 'sys' });
    expect(call.prompt[1].content).toHaveLength(2);
  });

  it('throws INVALID_OUTPUT with the raw answer when it does not match the schema', async () => {
    const client = new VercelAiClient(() => modelAnswering('{"label":"C"}'));

    const error = await client.generateObject(input).catch((e) => e);

    expect(error).toBeInstanceOf(AiGenerationError);
    expect(error.kind).toBe(EAiErrorKind.INVALID_OUTPUT);
    expect(error.raw).toEqual({ label: 'C' });
  });

  it('throws REQUEST when the provider call fails', async () => {
    const model = new MockLanguageModelV3({
      doGenerate: async () => {
        throw new Error('network down');
      },
    });
    const client = new VercelAiClient(() => model);

    const error = await client.generateObject(input).catch((e) => e);

    expect(error).toBeInstanceOf(AiGenerationError);
    expect(error.kind).toBe(EAiErrorKind.REQUEST);
  });
});

describe('InMemoryAiClientFactory', () => {
  it('answers from the queue and records requests', async () => {
    const factory = new InMemoryAiClientFactory();
    factory.enqueue({ output: { label: 'B' } }, new Error('boom'));
    const client = factory.create({ provider: 'GEMINI', apiKey: 'k' });

    await expect(client.generateObject(input)).resolves.toEqual({
      output: { label: 'B' },
      raw: { label: 'B' },
    });
    await expect(client.generateObject(input)).rejects.toThrow('boom');
    await expect(client.generateObject(input)).rejects.toThrow(
      'no answer queued',
    );
    expect(factory.requests).toHaveLength(3);
    expect(factory.created).toEqual([{ provider: 'GEMINI', apiKey: 'k' }]);
  });
});
