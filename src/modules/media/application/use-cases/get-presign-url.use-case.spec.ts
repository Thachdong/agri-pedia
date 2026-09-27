import { InMemoryFileStorage } from '@shared/storage';
import { EMediaType, InvalidMediaExtensionException } from '../../domain';
import { GetPresignUrlUseCase } from './get-presign-url.use-case';

const KEY = (userId: string, ext: string) =>
  new RegExp(
    `^tmp/${userId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.${ext}$`,
  );

describe('GetPresignUrlUseCase', () => {
  let storage: InMemoryFileStorage;
  let useCase: GetPresignUrlUseCase;

  beforeEach(() => {
    storage = new InMemoryFileStorage();
    useCase = new GetPresignUrlUseCase(storage);
  });

  it('presigns one TMP key per file, in input order, with content type and 10MB limit', async () => {
    const { items } = await useCase.execute({
      userId: 'u1',
      files: [
        { type: EMediaType.IMAGE, extension: '.JPG' },
        { type: EMediaType.VIDEO, extension: 'mov' },
        { type: EMediaType.FILE, extension: 'pdf' },
      ],
    });

    expect(items.map((i) => i.key)).toEqual([
      expect.stringMatching(KEY('u1', 'jpg')),
      expect.stringMatching(KEY('u1', 'mov')),
      expect.stringMatching(KEY('u1', 'pdf')),
    ]);
    expect(storage.presigned).toEqual([
      { key: items[0].key, contentType: 'image/jpeg', maxSizeBytes: 10485760 },
      {
        key: items[1].key,
        contentType: 'video/quicktime',
        maxSizeBytes: 10485760,
      },
      {
        key: items[2].key,
        contentType: 'application/pdf',
        maxSizeBytes: 10485760,
      },
    ]);
    expect(items[0]).toEqual({
      key: items[0].key,
      presignUrl: `https://storage.test/${items[0].key}?signed=1`,
      headers: {
        'Content-Type': 'image/jpeg',
        'x-goog-content-length-range': '0,10485760',
      },
    });
  });

  it('generates a distinct key for identical files', async () => {
    const file = { type: EMediaType.IMAGE, extension: 'png' };
    const { items } = await useCase.execute({
      userId: 'u1',
      files: [file, file],
    });
    expect(items[0].key).not.toBe(items[1].key);
  });

  it('rejects the whole request listing every invalid file, without presigning', async () => {
    const run = useCase.execute({
      userId: 'u1',
      files: [
        { type: EMediaType.IMAGE, extension: 'png' },
        { type: EMediaType.VIDEO, extension: 'png' },
        { type: EMediaType.IMAGE, extension: 'gif' },
      ],
    });

    await expect(run).rejects.toBeInstanceOf(InvalidMediaExtensionException);
    await expect(run).rejects.toMatchObject({
      details: {
        files: [
          expect.objectContaining({ index: 1, extension: 'png' }),
          expect.objectContaining({ index: 2, extension: 'gif' }),
        ],
      },
    });
    expect(storage.presigned).toEqual([]);
  });
});
