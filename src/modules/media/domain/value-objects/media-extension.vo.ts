import { EMediaType } from '../enums/media-type.enum';
import { InvalidMediaExtensionException } from '../exceptions/invalid-media-extension.exception';

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
    const value = raw.trim().replace(/^\./, '').toLowerCase();
    const allowed = CONTENT_TYPES[type];
    const contentType = allowed.get(value);
    if (!contentType) {
      throw new InvalidMediaExtensionException(type, raw, [...allowed.keys()]);
    }
    return new MediaExtension(value, contentType);
  }
}
