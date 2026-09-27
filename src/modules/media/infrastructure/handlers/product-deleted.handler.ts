import { Injectable } from '@nestjs/common';
import { OnIntegrationEvent } from '@shared/event-bus';
import {
  PRODUCT_DELETED_EVENT,
  TProductDeletedEvent,
} from '@modules/product/contracts';
import { RemoveAllMediaUseCase } from '../../application/use-cases';
import { EMediaOwnerType } from '../../domain';

@Injectable()
export class ProductDeletedHandler {
  constructor(private readonly removeAllMedia: RemoveAllMediaUseCase) {}

  @OnIntegrationEvent(PRODUCT_DELETED_EVENT)
  async handle(event: TProductDeletedEvent): Promise<void> {
    await this.removeAllMedia.execute({
      ownerType: EMediaOwnerType.PRODUCT,
      ownerId: event.payload.productId,
    });
  }
}
