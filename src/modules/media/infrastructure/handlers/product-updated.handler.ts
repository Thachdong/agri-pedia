import { Injectable } from '@nestjs/common';
import { OnIntegrationEvent } from '@shared/event-bus';
import {
  PRODUCT_UPDATED_EVENT,
  TProductUpdatedEvent,
} from '@modules/product/contracts';
import {
  ConfirmMediaUseCase,
  RemoveMediaUseCase,
} from '../../application/use-cases';
import { EMediaOwnerType, EMediaType } from '../../domain';

@Injectable()
export class ProductUpdatedHandler {
  constructor(
    private readonly removeMedia: RemoveMediaUseCase,
    private readonly confirmMedia: ConfirmMediaUseCase,
  ) {}

  @OnIntegrationEvent(PRODUCT_UPDATED_EVENT)
  async handle(event: TProductUpdatedEvent): Promise<void> {
    const { productId, userId, addMedia, removeMediaIds } = event.payload;
    const tasks: Promise<void>[] = [];
    if (removeMediaIds.length > 0) {
      tasks.push(
        this.removeMedia.execute({
          ownerType: EMediaOwnerType.PRODUCT,
          ownerId: productId,
          mediaIds: removeMediaIds,
        }),
      );
    }
    if (addMedia.length > 0) {
      tasks.push(
        this.confirmMedia.execute({
          uploaderId: userId,
          ownerType: EMediaOwnerType.PRODUCT,
          ownerId: productId,
          files: addMedia.map((file) => ({
            key: file.key,
            type: file.type as EMediaType,
            extension: file.extension,
            filename: file.filename,
            sortOrder: file.sortOrder,
          })),
        }),
      );
    }
    await Promise.all(tasks);
  }
}
