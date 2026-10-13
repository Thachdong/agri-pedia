import {
  IVisionDiagnosisProvider,
  TDescribeInput,
  TDescribeOutput,
  TVerifyInput,
  TVerifyOutput,
  TVisionProviderInfo,
} from '../vision-diagnosis.provider';

type TAnswer<T> = T | Error;

/**
 * Test fake: answers from per-image queues keyed by the image content (`describe`) or
 * thumbnail content (`verify`); an Error answer is thrown. Records every request.
 */
export class FakeVisionDiagnosisProvider implements IVisionDiagnosisProvider {
  readonly describeRequests: TDescribeInput[] = [];
  readonly verifyRequests: TVerifyInput[] = [];
  private readonly describeAnswers = new Map<
    string,
    TAnswer<TDescribeOutput>[]
  >();
  private readonly verifyAnswers = new Map<string, TAnswer<TVerifyOutput>[]>();

  info(): TVisionProviderInfo {
    return {
      provider: 'GEMINI',
      model: 'describe-model+verify-model',
      promptVersion: 'd1+v1',
    };
  }

  /** `image` = content of the normalized image. */
  onDescribe(image: string, ...answers: TAnswer<TDescribeOutput>[]): void {
    this.describeAnswers.set(image, answers);
  }

  /** `image` = content of the normalized image (its thumbnail is sent). */
  onVerify(image: string, ...answers: TAnswer<TVerifyOutput>[]): void {
    this.verifyAnswers.set(`thumb:${image}`, answers);
  }

  async describe(input: TDescribeInput): Promise<TDescribeOutput> {
    this.describeRequests.push(input);
    return next(this.describeAnswers, input.image.data.toString());
  }

  async verify(input: TVerifyInput): Promise<TVerifyOutput> {
    this.verifyRequests.push(input);
    return next(this.verifyAnswers, input.thumbnail.data.toString());
  }
}

function next<T>(answers: Map<string, TAnswer<T>[]>, key: string): T {
  const answer = answers.get(key)?.shift();
  if (answer === undefined) throw new Error(`No fake answer for ${key}`);
  if (answer instanceof Error) throw answer;
  return answer;
}
