import { Inject, Injectable } from '@nestjs/common';
import { FILE_STORAGE, IFileStorage } from '@shared/storage';
import { IMediaRepository, MEDIA_REPOSITORY } from '../../application/ports';
import { IMediaQueryPort, TMediaThumbnail } from '../../contracts';
import { EMediaOwnerType } from '../../domain';

@Injectable()
export class MediaQueryService implements IMediaQueryPort {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly media: IMediaRepository,
    @Inject(FILE_STORAGE) private readonly storage: IFileStorage,
  ) {}

  async findThumbnails(
    ownerType: 'PRODUCT',
    ownerIds: string[],
  ): Promise<TMediaThumbnail[]> {
    if (ownerIds.length === 0) {
      return [];
    }
    const images = await this.media.findFirstImagesByOwners(
      ownerType as EMediaOwnerType,
      ownerIds,
    );
    return Promise.all(
      images.map(async (image) => ({
        ownerId: image.ownerId,
        url: await this.storage.createDownloadUrl(image.source),
      })),
    );
  }
}
