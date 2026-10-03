import { Injectable } from '@nestjs/common';
import { OnIntegrationEvent } from '@shared/event-bus';
import {
  PRODUCT_CREATED_EVENT,
  TProductCreatedEvent,
} from '@modules/product/contracts';
import { ConfirmMediaUseCase } from '../../application/use-cases';
import { EMediaOwnerType, EMediaType } from '../../domain';

@Injectable()
export class ProductCreatedHandler {
  constructor(private readonly confirmMedia: ConfirmMediaUseCase) {}

  @OnIntegrationEvent(PRODUCT_CREATED_EVENT)
  async handle(event: TProductCreatedEvent): Promise<void> {
    await this.confirmMedia.execute({
      uploaderId: event.payload.userId,
      ownerType: EMediaOwnerType.PRODUCT,
      ownerId: event.payload.productId,
      files: event.payload.media.map((file) => ({
        key: file.key,
        type: file.type as EMediaType,
        extension: file.extension,
        filename: file.filename,
        sortOrder: file.sortOrder,
      })),
    });
  }
}
