import { IUserQueryPort, TUserRoleSummary } from '@modules/user/contracts';
import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryEventBus } from '@shared/event-bus';
import { PRODUCT_CREATED_EVENT } from '../../contracts';
import {
  EProductStatus,
  EProductUnit,
  InvalidProductPriceException,
  ProductCategoryNotFoundException,
  ProductSellerNotAllowedException,
} from '../../domain';
import {
  InMemoryCategoryRepository,
  InMemoryProductRepository,
} from '../ports/fakes';
import {
  CreateProductUseCase,
  TCreateProductInput,
} from './create-product.use-case';

const input: TCreateProductInput = {
  userId: 'u1',
  name: 'Phân NPK',
  description: 'Bao 50kg',
  price: 350000,
  categoryId: 'c1',
  quantity: 20,
  unit: EProductUnit.BAG,
  media: [
    {
      key: 'tmp/u1/0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10.png',
      type: 'IMAGE',
      extension: 'png',
      filename: 'front.png',
      sortOrder: 0,
    },
  ],
};

describe('CreateProductUseCase', () => {
  let products: InMemoryProductRepository;
  let categories: InMemoryCategoryRepository;
  let seller: TUserRoleSummary | null;
  let eventBus: InMemoryEventBus;
  let useCase: CreateProductUseCase;

  beforeEach(() => {
    products = new InMemoryProductRepository();
    categories = new InMemoryCategoryRepository();
    categories.add({ id: 'c1', name: 'Phân bón' });
    seller = { userId: 'u1', role: 'DISTRIBUTOR', isActive: true };
    eventBus = new InMemoryEventBus();
    const userQuery: IUserQueryPort = {
      findByIdentifier: async () => null,
      findRoleById: async () => seller,
      findProfileById: async () => null,
      listProfilesByIds: async () => [],
    };
    useCase = new CreateProductUseCase(
      products,
      categories,
      userQuery,
      new InMemoryUnitOfWork(),
      eventBus,
    );
  });

  it('saves an ACTIVE product owned by the distributor', async () => {
    const { productId } = await useCase.execute(input);

    const saved = products.items.get(productId);
    expect(saved).toMatchObject({
      userId: 'u1',
      name: 'Phân NPK',
      categoryId: 'c1',
      status: EProductStatus.ACTIVE,
    });
  });

  it('publishes product.product.created with the TMP media after saving', async () => {
    const { productId } = await useCase.execute(input);

    expect(eventBus.published).toEqual([
      expect.objectContaining({
        name: PRODUCT_CREATED_EVENT,
        payload: { productId, userId: 'u1', media: input.media },
      }),
    ]);
  });

  it.each<[string, TUserRoleSummary | null]>([
    ['unknown user', null],
    ['farmer', { userId: 'u1', role: 'FARMER', isActive: true }],
    [
      'pending distributor',
      { userId: 'u1', role: 'DISTRIBUTOR', isActive: false },
    ],
  ])('rejects %s', async (_, summary) => {
    seller = summary;

    await expect(useCase.execute(input)).rejects.toThrow(
      ProductSellerNotAllowedException,
    );
    expect(products.items.size).toBe(0);
    expect(eventBus.published).toEqual([]);
  });

  it('rejects an unknown category', async () => {
    await expect(
      useCase.execute({ ...input, categoryId: 'missing' }),
    ).rejects.toThrow(ProductCategoryNotFoundException);
    expect(products.items.size).toBe(0);
    expect(eventBus.published).toEqual([]);
  });

  it('propagates domain validation', async () => {
    await expect(useCase.execute({ ...input, price: -1 })).rejects.toThrow(
      InvalidProductPriceException,
    );
    expect(eventBus.published).toEqual([]);
  });
});
