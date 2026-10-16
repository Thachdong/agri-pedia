import {
  IAiClient,
  IAiClientFactory,
  TAiClientOptions,
  TAiGenerateObjectInput,
  TAiGenerateObjectResult,
} from './ai.interface';

/** One queued answer: an output (raw = output), or an error to throw. */
export type TInMemoryAiAnswer = { output: unknown; raw?: unknown } | Error;

/**
 * Test fake: every created client shares one answer queue and one request log.
 * Requests with an empty queue fail, so tests state every answer they expect.
 */
export class InMemoryAiClientFactory implements IAiClientFactory {
  readonly created: TAiClientOptions[] = [];
  readonly requests: TAiGenerateObjectInput<unknown>[] = [];
  private readonly answers: TInMemoryAiAnswer[] = [];

  enqueue(...answers: TInMemoryAiAnswer[]): void {
    this.answers.push(...answers);
  }

  create(options: TAiClientOptions): IAiClient {
    this.created.push(options);
    return {
      generateObject: <T>(
        input: TAiGenerateObjectInput<T>,
      ): Promise<TAiGenerateObjectResult<T>> => this.answer(input),
    };
  }

  private async answer<T>(
    input: TAiGenerateObjectInput<T>,
  ): Promise<TAiGenerateObjectResult<T>> {
    this.requests.push(input as TAiGenerateObjectInput<unknown>);
    const next = this.answers.shift();
    if (next === undefined) {
      throw new Error('InMemoryAiClientFactory: no answer queued');
    }
    if (next instanceof Error) throw next;
    return { output: next.output as T, raw: next.raw ?? next.output };
  }
}
