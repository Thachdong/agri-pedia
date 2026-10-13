import * as sharp from 'sharp';
import { ImageUnreadableError } from '../../application/ports';
import { SharpImageProcessor } from './sharp-image.processor';

const solid = (width: number, height: number) =>
  sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 40, g: 160, b: 60 },
    },
  });

describe('SharpImageProcessor', () => {
  const processor = new SharpImageProcessor();

  it('rotates by EXIF, drops metadata, caps the long side at 2048px and outputs JPEG', async () => {
    // 3000x1000 stored with orientation 6 (rotate 90°) => displayed 1000x3000
    const input = await solid(3000, 1000)
      .withMetadata({ orientation: 6 })
      .png()
      .toBuffer();

    const out = await processor.normalize(input);

    expect(out.mimeType).toBe('image/jpeg');
    expect([out.width, out.height]).toEqual([683, 2048]);
    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.orientation).toBeUndefined();
    expect(meta.exif).toBeUndefined();
  });

  it('keeps small images at their size', async () => {
    const out = await processor.normalize(
      await solid(400, 300).webp().toBuffer(),
    );
    expect([out.width, out.height]).toEqual([400, 300]);
  });

  it('rejects content that is not a supported image, whatever the name', async () => {
    await expect(
      processor.normalize(Buffer.from('not an image')),
    ).rejects.toBeInstanceOf(ImageUnreadableError);
    const gif = await solid(10, 10).gif().toBuffer();
    await expect(processor.normalize(gif)).rejects.toThrow(
      'Unsupported image format gif',
    );
  });

  it('crops ~2x around the region, at least 256px, inside the image', async () => {
    const image = await processor.normalize(
      await solid(1000, 800).jpeg().toBuffer(),
    );

    const centered = await processor.crop(image, {
      x: 0.4,
      y: 0.4,
      w: 0.2,
      h: 0.2,
    });
    expect([centered.width, centered.height]).toEqual([400, 320]);

    const tiny = await processor.crop(image, {
      x: 0.95,
      y: 0,
      w: 0.01,
      h: 0.01,
    });
    expect([tiny.width, tiny.height]).toEqual([256, 256]);
  });

  it('makes a downscaled thumbnail', async () => {
    const image = await processor.normalize(
      await solid(2000, 1000).jpeg().toBuffer(),
    );
    const thumb = await processor.thumbnail(image);
    expect([thumb.width, thumb.height]).toEqual([768, 384]);
  });
});
