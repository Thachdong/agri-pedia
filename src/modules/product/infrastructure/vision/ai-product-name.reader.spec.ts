import * as sharp from 'sharp';
import { IConfigService } from '@shared/config';
import { InMemoryAiClientFactory } from '@shared/ai';
import { ProductPhotoUnreadableError } from '../../application/ports';
import { AiProductNameReader } from './ai-product-name.reader';
import {
  PRODUCT_NAME_SYSTEM_PROMPT,
  productNameOutputSchema,
} from './product-name.prompt';

const config = (model = 'gemini-3-flash-lite') =>
  ({
    get: () => ({
      provider: 'GEMINI',
      apiKey: 'key',
      model,
      timeoutMs: 1000,
      matchThreshold: 0.4,
    }),
  }) as unknown as IConfigService;

const png = (width: number, height: number) =>
  sharp({
    create: { width, height, channels: 3, background: '#ffffff' },
  })
    .png()
    .toBuffer();

describe('AiProductNameReader', () => {
  let ai: InMemoryAiClientFactory;

  beforeEach(() => {
    ai = new InMemoryAiClientFactory();
  });

  it('sends a downscaled JPEG with the fixed prompt and returns the trimmed name', async () => {
    ai.enqueue({ output: { productName: '  Anvil 5SC ' } });
    const reader = new AiProductNameReader(ai, config());

    const name = await reader.read({
      data: await png(3000, 1500),
      mimeType: 'image/png',
    });

    expect(name).toBe('Anvil 5SC');
    expect(ai.created).toEqual([{ provider: 'GEMINI', apiKey: 'key' }]);
    const [request] = ai.requests;
    expect(request).toMatchObject({
      model: 'gemini-3-flash-lite',
      system: PRODUCT_NAME_SYSTEM_PROMPT,
      schema: productNameOutputSchema,
      temperature: undefined,
      timeoutMs: 1000,
    });
    const image = request.content.find((part) => part.type === 'image');
    expect(image).toMatchObject({ mimeType: 'image/jpeg' });
    const meta = await sharp((image as { data: Buffer }).data).metadata();
    expect({
      format: meta.format,
      width: meta.width,
      height: meta.height,
    }).toEqual({
      format: 'jpeg',
      width: 1024,
      height: 512,
    });
  });

  it('uses temperature 0 for models other than Gemini 3', async () => {
    ai.enqueue({ output: { productName: 'Anvil' } });
    const reader = new AiProductNameReader(ai, config('gemini-2.5-flash-lite'));

    await reader.read({ data: await png(10, 10), mimeType: 'image/png' });

    expect(ai.requests[0].temperature).toBe(0);
  });

  it('returns null when no name was read', async () => {
    ai.enqueue({ output: { productName: '  ' } });
    const reader = new AiProductNameReader(ai, config());

    expect(
      await reader.read({ data: await png(10, 10), mimeType: 'image/png' }),
    ).toBeNull();
  });

  it('throws ProductPhotoUnreadableError for content that is not an image, without calling the AI', async () => {
    const reader = new AiProductNameReader(ai, config());

    await expect(
      reader.read({
        data: Buffer.from('not an image'),
        mimeType: 'image/jpeg',
      }),
    ).rejects.toThrow(ProductPhotoUnreadableError);
    expect(ai.requests).toHaveLength(0);
  });

  it('lets AI errors through', async () => {
    const failure = new Error('timeout');
    ai.enqueue(failure);
    const reader = new AiProductNameReader(ai, config());

    await expect(
      reader.read({ data: await png(10, 10), mimeType: 'image/png' }),
    ).rejects.toBe(failure);
  });
});
