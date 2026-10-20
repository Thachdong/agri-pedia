import { Inject, Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { AI_CLIENT_FACTORY, IAiClient, IAiClientFactory } from '@shared/ai';
import {
  IProductNameReader,
  ProductPhotoUnreadableError,
  TProductPhoto,
} from '../../application/ports';
import { CATALOG_ITEM_NAME_MAX_LENGTH } from '../../domain';
import {
  PRODUCT_NAME_SYSTEM_PROMPT,
  PRODUCT_NAME_USER_TEXT,
  productNameOutputSchema,
} from './product-name.prompt';

const ACCEPTED_FORMATS = ['jpeg', 'png', 'webp'];
/** Enough to read a label; keeps the request small and cheap. */
const MAX_SIDE_PX = 1024;
const JPEG_QUALITY = 85;
const LOW_TEMPERATURE = 0;

/**
 * Reads the trade name through the shared AI client (provider + key + model from the
 * `productSuggestion` config). The photo is re-encoded in memory (EXIF rotation applied,
 * metadata dropped, long side <= 1024px) and never stored.
 */
@Injectable()
export class AiProductNameReader implements IProductNameReader {
  private readonly client: IAiClient;

  constructor(
    @Inject(AI_CLIENT_FACTORY) aiClients: IAiClientFactory,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
  ) {
    const { provider, apiKey } = config.get('productSuggestion');
    this.client = aiClients.create({ provider, apiKey });
  }

  async read(photo: TProductPhoto): Promise<string | null> {
    const image = await this.toJpeg(photo.data);
    const { model, timeoutMs } = this.config.get('productSuggestion');
    const { output } = await this.client.generateObject({
      model,
      system: PRODUCT_NAME_SYSTEM_PROMPT,
      content: [
        { type: 'text', text: PRODUCT_NAME_USER_TEXT },
        { type: 'image', data: image, mimeType: 'image/jpeg' },
      ],
      schema: productNameOutputSchema,
      // Gemini 3: Google recommends keeping the default temperature.
      temperature: model.startsWith('gemini-3') ? undefined : LOW_TEMPERATURE,
      timeoutMs,
    });
    const name = output.productName
      .trim()
      .slice(0, CATALOG_ITEM_NAME_MAX_LENGTH);
    return name === '' ? null : name;
  }

  private async toJpeg(data: Buffer): Promise<Buffer> {
    let format: string | undefined;
    try {
      ({ format } = await sharp(data).metadata());
    } catch {
      throw new ProductPhotoUnreadableError('unreadable image');
    }
    if (!format || !ACCEPTED_FORMATS.includes(format)) {
      throw new ProductPhotoUnreadableError(
        `unsupported image format ${format ?? 'unknown'} (jpg, png, webp only)`,
      );
    }
    try {
      return await sharp(data)
        .rotate()
        .resize(MAX_SIDE_PX, MAX_SIDE_PX, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();
    } catch {
      throw new ProductPhotoUnreadableError('unreadable image');
    }
  }
}
