import { EMediaOwnerType, Media } from '../../../domain';
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

  async save(media: Media): Promise<void> {
    this.items.set(media.id, media);
  }

  async delete(ids: string[]): Promise<void> {
    ids.forEach((id) => this.items.delete(id));
  }
}
