import { InMemoryFileStorage } from '@shared/storage';
import * as sharp from 'sharp';
import { SharpArticleImagePublisher } from './sharp-article-image.publisher';

const png = (width: number, height: number): Promise<Buffer> =>
  sharp({
    create: { width, height, channels: 3, background: '#3a7d44' },
  })
    .png()
    .toBuffer();

describe('SharpArticleImagePublisher', () => {
  it('re-encodes an upload as webp, scales it down and uploads it publicly', async () => {
    const storage = new InMemoryFileStorage();
    await storage.uploadFile(
      'tmp/u1/a.png',
      await png(3200, 1600),
      'image/png',
    );

    const published = await new SharpArticleImagePublisher(storage).publish({
      tmpKey: 'tmp/u1/a.png',
      keyPrefix: 'articles/RICE/RICE_BPH/ray-nau-1',
    });

    expect(published).toEqual({
      key: expect.stringMatching(
        /^articles\/RICE\/RICE_BPH\/ray-nau-1\.[0-9a-f]{8}\.webp$/,
      ),
      width: 1600,
      height: 800,
    });
    const stored = storage.uploaded.get(published?.key ?? '');
    expect(stored).toMatchObject({ contentType: 'image/webp', isPublic: true });
    expect((await sharp(stored?.content).metadata()).format).toBe('webp');
    expect(storage.files.has('tmp/u1/a.png')).toBe(true);
  });

  it('keeps a small image at its size', async () => {
    const storage = new InMemoryFileStorage();
    await storage.uploadFile('tmp/u1/a.png', await png(400, 300), 'image/png');

    const published = await new SharpArticleImagePublisher(storage).publish({
      tmpKey: 'tmp/u1/a.png',
      keyPrefix: 'articles/RICE/X/a',
    });

    expect(published).toMatchObject({ width: 400, height: 300 });
  });

  it('returns null for a missing upload or a file that is not an image', async () => {
    const storage = new InMemoryFileStorage();
    await storage.uploadFile(
      'tmp/u1/a.pdf',
      Buffer.from('%PDF-1.4'),
      'application/pdf',
    );
    const publisher = new SharpArticleImagePublisher(storage);

    await expect(
      publisher.publish({ tmpKey: 'tmp/u1/missing.png', keyPrefix: 'p' }),
    ).resolves.toBeNull();
    await expect(
      publisher.publish({ tmpKey: 'tmp/u1/a.pdf', keyPrefix: 'p' }),
    ).resolves.toBeNull();
    expect([...storage.uploaded.keys()]).toEqual(['tmp/u1/a.pdf']);
  });
});
