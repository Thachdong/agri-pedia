import type { ZodType } from 'zod';

/** AI providers the project can call. Add one here together with its branch in the client factory. */
export type TAiProvider = 'GEMINI';

export type TAiContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; data: Buffer; mimeType: string };

export type TAiGenerateObjectInput<T> = {
  model: string;
  /** Fixed instructions; keep stable across calls so the provider can cache them. */
  system: string;
  /** User message: text and images, in order. */
  content: TAiContentPart[];
  /** Expected output; sent to the provider as structured-output JSON Schema and used to validate the answer. */
  schema: ZodType<T>;
  temperature?: number;
  timeoutMs: number;
};

export type TAiGenerateObjectResult<T> = {
  output: T;
  /** Model answer as returned (parsed JSON, or the text when it is not JSON), for debugging. */
  raw: unknown;
};

export enum EAiErrorKind {
  /** Request failed: network, timeout, provider error. */
  REQUEST = 'REQUEST',
  /** Answer is not valid JSON or does not match the schema. */
  INVALID_OUTPUT = 'INVALID_OUTPUT',
}

/** Thrown by IAiClient.generateObject. No retry is done inside the client. */
export class AiGenerationError extends Error {
  constructor(
    readonly kind: EAiErrorKind,
    message: string,
    /** Model answer when one was received (INVALID_OUTPUT). */
    readonly raw?: unknown,
  ) {
    super(message);
    this.name = AiGenerationError.name;
  }
}

export interface IAiClient {
  /** One request returning an object that matches `schema`; throws AiGenerationError. */
  generateObject<T>(
    input: TAiGenerateObjectInput<T>,
  ): Promise<TAiGenerateObjectResult<T>>;
}

export type TAiClientOptions = {
  provider: TAiProvider;
  apiKey: string;
};

/** Creates clients per provider + key, so each business module chooses and configures its own. */
export interface IAiClientFactory {
  create(options: TAiClientOptions): IAiClient;
}

export const AI_CLIENT_FACTORY = Symbol('AI_CLIENT_FACTORY');
