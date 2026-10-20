import * as sharp from 'sharp';
import { SharpImageQualityInspector } from './sharp-image-quality.inspector';

/** 800x600 JPEG: a checkerboard (sharp edges) or a flat grey. */
async function jpeg(kind: 'checker' | 'flat', grey = 128): Promise<Buffer> {
  const width = 800;
  const height = 600;
  const pixels = Buffer.alloc(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      pixels[y * width + x] =
        kind === 'flat'
          ? grey
          : (Math.floor(x / 20) + Math.floor(y / 20)) % 2
            ? 255
            : 0;
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 1 } })
    .jpeg()
    .toBuffer();
}

describe('SharpImageQualityInspector', () => {
  const inspector = new SharpImageQualityInspector();

  it('reports size, sharpness and brightness', async () => {
    const quality = await inspector.inspect(await jpeg('checker'));

    expect(quality.width).toBe(800);
    expect(quality.height).toBe(600);
    expect(quality.brightness).toBeGreaterThan(100);
    expect(quality.brightness).toBeLessThan(155);
    expect(quality.sharpness).toBeGreaterThan(
      (await inspector.inspect(await jpeg('flat'))).sharpness,
    );
  });

  it('reports a dark image as dark', async () => {
    const quality = await inspector.inspect(await jpeg('flat', 10));

    expect(quality.brightness).toBeLessThan(20);
  });

  it('throws on content that is not an image', async () => {
    await expect(inspector.inspect(Buffer.from('nope'))).rejects.toThrow();
  });
});
