import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  createIntegrationEvent,
  EVENT_BUS,
  IEventBus,
} from '@shared/event-bus';
import {
  PRODUCT_DELETED_EVENT,
  TProductDeletedEventPayload,
} from '../../contracts';
import {
  ProductNotFoundException,
  ProductSellerNotAllowedException,
} from '../../domain';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../ports/product.repository';

export type TDeleteProductInput = {
  userId: string;
  productId: string;
};

/** Soft-deletes a product listed by the calling ACTIVE distributor. */
@Injectable()
export class DeleteProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: IProductRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(input: TDeleteProductInput): Promise<void> {
    const seller = await this.userQuery.findRoleById(input.userId);
    if (!seller || seller.role !== 'DISTRIBUTOR' || !seller.isActive) {
      throw new ProductSellerNotAllowedException(input.userId);
    }

    await this.unitOfWork.runInTransaction(async () => {
      const product = await this.products.findById(input.productId);
      if (!product) {
        throw new ProductNotFoundException(input.productId);
      }
      product.assertOwnedBy(input.userId);
      product.delete();
      await this.products.save(product);
    });

    await this.eventBus.publish(
      createIntegrationEvent<
        typeof PRODUCT_DELETED_EVENT,
        TProductDeletedEventPayload
      >(PRODUCT_DELETED_EVENT, { productId: input.productId }),
    );
  }
}
