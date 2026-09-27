import { Media } from '../../domain';

export interface IMediaRepository {
  save(media: Media): Promise<void>;
}

export const MEDIA_REPOSITORY = Symbol('MEDIA_REPOSITORY');
