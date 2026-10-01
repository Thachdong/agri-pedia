export type TMediaThumbnail = {
  ownerId: string;
  /** Signed read URL; expires after the configured download TTL. */
  url: string;
};

export type TMediaUrl = {
  mediaId: string;
  /** Signed read URL; expires after the configured download TTL. */
  url: string;
};

export type TMediaItem = {
  mediaId: string;
  type: 'IMAGE' | 'VIDEO' | 'FILE';
  /** Signed read URL; expires after the configured download TTL. */
  url: string;
};

export interface IMediaQueryPort {
  /**
   * Thumbnail of each owner (product image, or user avatar): its first IMAGE by sortOrder (null last, then id).
   * Owners without an image are left out of the result.
   */
  findThumbnails(
    ownerType: 'PRODUCT' | 'USER_AVATAR',
    ownerIds: string[],
  ): Promise<TMediaThumbnail[]>;
  /**
   * Signed read URL of each given media of the owner, any media type.
   * Ids of other owners or unknown ids are left out.
   */
  findUrls(
    ownerType: 'USER_LICENSE',
    ownerId: string,
    mediaIds: string[],
  ): Promise<TMediaUrl[]>;
  /** Every media of the owner, any media type, by sortOrder (null last, then id), with a signed read URL. */
  listByOwner(ownerType: 'PRODUCT', ownerId: string): Promise<TMediaItem[]>;
}
