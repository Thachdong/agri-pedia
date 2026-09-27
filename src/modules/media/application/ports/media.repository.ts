import { EMediaOwnerType, Media } from '../../domain';

export interface IMediaRepository {
  /** Media of the owner whose id is in `ids`; ids of other owners or unknown ids are left out. */
  findByOwner(
    ownerType: EMediaOwnerType,
    ownerId: string,
    ids: string[],
  ): Promise<Media[]>;
  findAllByOwner(ownerType: EMediaOwnerType, ownerId: string): Promise<Media[]>;
  /** Per owner, its first IMAGE by sortOrder (null last, then id); owners without an image are left out. */
  findFirstImagesByOwners(
    ownerType: EMediaOwnerType,
    ownerIds: string[],
  ): Promise<Media[]>;
  save(media: Media): Promise<void>;
  delete(ids: string[]): Promise<void>;
}

export const MEDIA_REPOSITORY = Symbol('MEDIA_REPOSITORY');
