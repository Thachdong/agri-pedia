import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  createIntegrationEvent,
  EVENT_BUS,
  IEventBus,
} from '@shared/event-bus';
import {
  PRODUCT_UPDATED_EVENT,
  TProductUpdatedEventPayload,
  TProductUpdatedMediaPayload,
} from '../../contracts';
import {
  EProductStatus,
  EProductUnit,
  ProductCategoryNotFoundException,
  ProductNotFoundException,
  ProductSellerNotAllowedException,
} from '../../domain';
import {
  CATEGORY_REPOSITORY,
  ICategoryRepository,
} from '../ports/category.repository';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../ports/product.repository';

export type TUpdateProductInput = {
  userId: string;
  productId: string;
  name?: string;
  description?: string;
  price?: number;
  quantity?: number;
  unit?: EProductUnit;
  categoryId?: string;
  status?: EProductStatus;
  /** Files already uploaded to TMP; confirmed asynchronously by the media module. */
  addMedia?: TProductUpdatedMediaPayload[];
  /** Removed asynchronously by the media module; ids of other products are ignored there. */
  removeMediaIds?: string[];
};

/** Changes a product listed by the calling ACTIVE distributor; omitted fields are kept. */
@Injectable()
export class UpdateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: IProductRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: ICategoryRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(input: TUpdateProductInput): Promise<void> {
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
      if (
        input.categoryId !== undefined &&
        !(await this.categories.existsById(input.categoryId))
      ) {
        throw new ProductCategoryNotFoundException(input.categoryId);
      }
      product.update({
        name: input.name,
        description: input.description,
        price: input.price,
        quantity: input.quantity,
        unit: input.unit,
        categoryId: input.categoryId,
        status: input.status,
      });
      await this.products.save(product);
    });

    await this.eventBus.publish(
      createIntegrationEvent<
        typeof PRODUCT_UPDATED_EVENT,
        TProductUpdatedEventPayload
      >(PRODUCT_UPDATED_EVENT, {
        productId: input.productId,
        userId: input.userId,
        addMedia: input.addMedia ?? [],
        removeMediaIds: input.removeMediaIds ?? [],
      }),
    );
  }
}
