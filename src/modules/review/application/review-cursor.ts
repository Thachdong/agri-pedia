import { InvalidReviewCursorException } from '../domain';
import { TReviewPageKey } from './ports/review.repository';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Opaque cursor: base64url JSON `{ c: createdAt ISO, i: id }`. */
export const encodeReviewCursor = (key: TReviewPageKey): string =>
  Buffer.from(
    JSON.stringify({ c: key.createdAt.toISOString(), i: key.id }),
  ).toString('base64url');

export const decodeReviewCursor = (cursor: string): TReviewPageKey => {
  try {
    const { c, i } = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    const createdAt = new Date(c);
    if (
      typeof c !== 'string' ||
      Number.isNaN(createdAt.getTime()) ||
      typeof i !== 'string' ||
      !UUID.test(i)
    ) {
      throw new Error('bad cursor');
    }
    return { createdAt, id: i };
  } catch {
    throw new InvalidReviewCursorException();
  }
};
