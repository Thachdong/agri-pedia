import { Media } from '../../../domain';
import { IMediaRepository } from '../media.repository';

export class InMemoryMediaRepository implements IMediaRepository {
  readonly items = new Map<string, Media>();

  async save(media: Media): Promise<void> {
    this.items.set(media.id, media);
  }
}
