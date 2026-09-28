export type TMediaThumbnail = {
  ownerId: string;
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
}
