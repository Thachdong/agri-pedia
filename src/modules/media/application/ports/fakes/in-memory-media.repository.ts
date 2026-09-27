import { EMediaOwnerType, EMediaType, Media } from '../../../domain';
import { IMediaRepository } from '../media.repository';

export class InMemoryMediaRepository implements IMediaRepository {
  readonly items = new Map<string, Media>();

  async findByOwner(
    ownerType: EMediaOwnerType,
    ownerId: string,
    ids: string[],
  ): Promise<Media[]> {
    return ids
      .map((id) => this.items.get(id))
      .filter(
        (media): media is Media =>
          media !== undefined &&
          media.ownerType === ownerType &&
          media.ownerId === ownerId,
      );
  }

  async findAllByOwner(
    ownerType: EMediaOwnerType,
    ownerId: string,
  ): Promise<Media[]> {
    return [...this.items.values()].filter(
      (media) => media.ownerType === ownerType && media.ownerId === ownerId,
    );
  }

  async findFirstImagesByOwners(
    ownerType: EMediaOwnerType,
    ownerIds: string[],
  ): Promise<Media[]> {
    const order = (a: Media, b: Media) =>
      (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity) ||
      a.id.localeCompare(b.id);
    return ownerIds.flatMap((ownerId) => {
      const [first] = [...this.items.values()]
        .filter(
          (media) =>
            media.ownerType === ownerType &&
            media.ownerId === ownerId &&
            media.type === EMediaType.IMAGE,
        )
        .sort(order);
      return first ? [first] : [];
    });
  }

  async save(media: Media): Promise<void> {
    this.items.set(media.id, media);
  }

  async delete(ids: string[]): Promise<void> {
    ids.forEach((id) => this.items.delete(id));
  }
}
