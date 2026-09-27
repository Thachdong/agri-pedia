import { InMemoryFileStorage } from '@shared/storage';
import { EMediaType, InvalidMediaExtensionException } from '../../domain';
import { GetPresignUrlUseCase } from './get-presign-url.use-case';

describe('GetPresignUrlUseCase', () => {
  let storage: InMemoryFileStorage;
  let useCase: GetPresignUrlUseCase;

  beforeEach(() => {
    storage = new InMemoryFileStorage();
    useCase = new GetPresignUrlUseCase(storage);
  });

  it('presigns a TMP key of the caller with content type and 10MB limit', async () => {
    const result = await useCase.execute({
      userId: 'u1',
      type: EMediaType.IMAGE,
      extension: '.JPG',
    });

    expect(result.key).toMatch(
      /^tmp\/u1\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/,
    );
    expect(storage.presigned).toEqual([
      { key: result.key, contentType: 'image/jpeg', maxSizeBytes: 10485760 },
    ]);
    expect(result.presignUrl).toBe(
      `https://storage.test/${result.key}?signed=1`,
    );
    expect(result.headers).toEqual({
      'Content-Type': 'image/jpeg',
      'x-goog-content-length-range': '0,10485760',
    });
  });

  it('generates a new key per call', async () => {
    const input = { userId: 'u1', type: EMediaType.FILE, extension: 'pdf' };
    const first = await useCase.execute(input);
    const second = await useCase.execute(input);
    expect(first.key).not.toBe(second.key);
  });

  it('rejects an extension not allowed for the type, without presigning', async () => {
    await expect(
      useCase.execute({
        userId: 'u1',
        type: EMediaType.VIDEO,
        extension: 'png',
      }),
    ).rejects.toBeInstanceOf(InvalidMediaExtensionException);
    expect(storage.presigned).toEqual([]);
  });
});
