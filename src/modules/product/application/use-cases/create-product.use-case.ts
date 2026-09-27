import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  createIntegrationEvent,
  EVENT_BUS,
  IEventBus,
} from '@shared/event-bus';
import {
  PRODUCT_CREATED_EVENT,
  TProductCreatedEventPayload,
  TProductCreatedMediaPayload,
} from '../../contracts';
import {
  EProductUnit,
  Product,
  ProductCategoryNotFoundException,
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

export type TCreateProductInput = {
  userId: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  quantity: number;
  unit: EProductUnit;
  /** Files already uploaded to TMP; confirmed asynchronously by the media module. */
  media: TProductCreatedMediaPayload[];
};
export type TCreateProductOutput = { productId: string };

/** Lists a new ACTIVE product for an ACTIVE distributor. */
@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: IProductRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: ICategoryRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(input: TCreateProductInput): Promise<TCreateProductOutput> {
    const seller = await this.userQuery.findRoleById(input.userId);
    if (!seller || seller.role !== 'DISTRIBUTOR' || !seller.isActive) {
      throw new ProductSellerNotAllowedException(input.userId);
    }

    const product = await this.unitOfWork.runInTransaction(async () => {
      if (!(await this.categories.existsById(input.categoryId))) {
        throw new ProductCategoryNotFoundException(input.categoryId);
      }
      const created = Product.create({
        userId: input.userId,
        name: input.name,
        description: input.description,
        price: input.price,
        quantity: input.quantity,
        unit: input.unit,
        categoryId: input.categoryId,
      });
      await this.products.save(created);
      return created;
    });

    await this.eventBus.publish(
      createIntegrationEvent<
        typeof PRODUCT_CREATED_EVENT,
        TProductCreatedEventPayload
      >(PRODUCT_CREATED_EVENT, {
        productId: product.id,
        userId: product.userId,
        media: input.media,
      }),
    );
    return { productId: product.id };
  }
}
