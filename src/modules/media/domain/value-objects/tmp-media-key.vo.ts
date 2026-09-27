import { InvalidTmpMediaKeyException } from '../exceptions/invalid-tmp-media-key.exception';
import { MediaExtension } from './media-extension.vo';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Key of a file uploaded to TMP via a presigned URL: `tmp/<uploaderId>/<uuid>.<extension>`. */
export class TmpMediaKey {
  private constructor(readonly value: string) {}

  /** Rejects keys of other users, other folders, or with an extension other than the declared one. */
  static create(
    raw: string,
    uploaderId: string,
    extension: MediaExtension,
  ): TmpMediaKey {
    const pattern = new RegExp(
      `^tmp/${escapeRegExp(uploaderId)}/${UUID}\\.${escapeRegExp(extension.value)}$`,
    );
    if (!pattern.test(raw)) {
      throw new InvalidTmpMediaKeyException(raw, uploaderId);
    }
    return new TmpMediaKey(raw);
  }
}
