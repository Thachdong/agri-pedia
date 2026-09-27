import { EMediaType } from '../enums/media-type.enum';
import {
  InvalidMediaExtensionException,
  TInvalidMediaExtension,
} from '../exceptions/invalid-media-extension.exception';

/** Allowed extensions per media type, with the Content-Type each one is stored under. */
const CONTENT_TYPES: Record<EMediaType, ReadonlyMap<string, string>> = {
  [EMediaType.IMAGE]: new Map([
    ['jpg', 'image/jpeg'],
    ['jpeg', 'image/jpeg'],
    ['png', 'image/png'],
    ['webp', 'image/webp'],
  ]),
  [EMediaType.VIDEO]: new Map([
    ['mp4', 'video/mp4'],
    ['mov', 'video/quicktime'],
  ]),
  [EMediaType.FILE]: new Map([['pdf', 'application/pdf']]),
};

export class MediaExtension {
  private constructor(
    /** Lowercase, without leading dot, e.g. `png`. */
    readonly value: string,
    readonly contentType: string,
  ) {}

  /** Accepts `png`, `.PNG`, ` Png ` -> `png`; must be allowed for `type`. */
  static create(type: EMediaType, raw: string): MediaExtension {
    return MediaExtension.createMany([{ type, extension: raw }])[0];
  }

  /**
   * Validates every item first; if any is not allowed, throws one exception listing all of them
   * (by index), so nothing is half-accepted. Result keeps the input order.
   */
  static createMany(
    items: { type: EMediaType; extension: string }[],
  ): MediaExtension[] {
    const valid: MediaExtension[] = [];
    const invalid: TInvalidMediaExtension[] = [];
    items.forEach(({ type, extension }, index) => {
      const value = extension.trim().replace(/^\./, '').toLowerCase();
      const allowed = CONTENT_TYPES[type];
      const contentType = allowed.get(value);
      if (contentType) {
        valid.push(new MediaExtension(value, contentType));
      } else {
        invalid.push({ index, type, extension, allowed: [...allowed.keys()] });
      }
    });
    if (invalid.length > 0) {
      throw new InvalidMediaExtensionException(invalid);
    }
    return valid;
  }
}
