import { IUserQueryPort, TUserRoleSummary } from '@modules/user/contracts';
import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryEventBus } from '@shared/event-bus';
import { PRODUCT_UPDATED_EVENT } from '../../contracts';
import {
  EProductStatus,
  EProductUnit,
  InvalidProductQuantityException,
  Product,
  ProductCategoryNotFoundException,
  ProductNotFoundException,
  ProductNotOwnerException,
  ProductSellerNotAllowedException,
} from '../../domain';
import {
  InMemoryCategoryRepository,
  InMemoryProductRepository,
} from '../ports/fakes';
import { UpdateProductUseCase } from './update-product.use-case';

describe('UpdateProductUseCase', () => {
  let products: InMemoryProductRepository;
  let categories: InMemoryCategoryRepository;
  let seller: TUserRoleSummary | null;
  let product: Product;
  let eventBus: InMemoryEventBus;
  let useCase: UpdateProductUseCase;

  beforeEach(async () => {
    products = new InMemoryProductRepository();
    categories = new InMemoryCategoryRepository();
    categories.add({ id: 'c1', name: 'Phân bón' });
    categories.add({ id: 'c2', name: 'Giống cây trồng' });
    seller = { userId: 'u1', role: 'DISTRIBUTOR', isActive: true };
    product = Product.create({
      userId: 'u1',
      name: 'Phân NPK',
      description: 'Bao 50kg',
      price: 350000,
      quantity: 20,
      unit: EProductUnit.BAG,
      categoryId: 'c1',
    });
    await products.save(product);
    eventBus = new InMemoryEventBus();
    const userQuery: IUserQueryPort = {
      findByIdentifier: async () => null,
      findRoleById: async () => seller,
      findProfileById: async () => null,
      listProfilesByIds: async () => [],
    };
    useCase = new UpdateProductUseCase(
      products,
      categories,
      userQuery,
      new InMemoryUnitOfWork(),
      eventBus,
    );
  });

  it('saves the given fields and keeps the others', async () => {
    await useCase.execute({
      userId: 'u1',
      productId: product.id,
      price: 400000,
      categoryId: 'c2',
      status: EProductStatus.OUT_OF_STOCK,
    });

    expect(products.items.get(product.id)).toMatchObject({
      name: 'Phân NPK',
      price: 400000,
      quantity: 20,
      categoryId: 'c2',
      status: EProductStatus.OUT_OF_STOCK,
    });
  });

  it('publishes product.product.updated with the media changes after saving', async () => {
    const addMedia = [
      {
        key: 'tmp/u1/0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10.png',
        type: 'IMAGE' as const,
        extension: 'png',
        filename: 'side.png',
        sortOrder: 2,
      },
    ];

    await useCase.execute({
      userId: 'u1',
      productId: product.id,
      addMedia,
      removeMediaIds: ['m1'],
    });

    expect(eventBus.published).toEqual([
      expect.objectContaining({
        name: PRODUCT_UPDATED_EVENT,
        payload: {
          productId: product.id,
          userId: 'u1',
          addMedia,
          removeMediaIds: ['m1'],
        },
      }),
    ]);
  });

  it('publishes empty media lists when none are given', async () => {
    await useCase.execute({ userId: 'u1', productId: product.id, name: 'X' });

    expect(eventBus.published).toEqual([
      expect.objectContaining({
        payload: {
          productId: product.id,
          userId: 'u1',
          addMedia: [],
          removeMediaIds: [],
        },
      }),
    ]);
  });

  it.each<[string, TUserRoleSummary | null]>([
    ['unknown user', null],
    ['farmer', { userId: 'u1', role: 'FARMER', isActive: true }],
    [
      'inactive distributor',
      { userId: 'u1', role: 'DISTRIBUTOR', isActive: false },
    ],
  ])('rejects %s', async (_, summary) => {
    seller = summary;

    await expect(
      useCase.execute({ userId: 'u1', productId: product.id, price: 1 }),
    ).rejects.toThrow(ProductSellerNotAllowedException);
    expect(product.price).toBe(350000);
    expect(eventBus.published).toEqual([]);
  });

  it('rejects an unknown product', async () => {
    await expect(
      useCase.execute({ userId: 'u1', productId: 'missing' }),
    ).rejects.toThrow(ProductNotFoundException);
    expect(eventBus.published).toEqual([]);
  });

  it('rejects a product of another distributor', async () => {
    seller = { userId: 'u2', role: 'DISTRIBUTOR', isActive: true };

    await expect(
      useCase.execute({ userId: 'u2', productId: product.id, price: 1 }),
    ).rejects.toThrow(ProductNotOwnerException);
    expect(product.price).toBe(350000);
    expect(eventBus.published).toEqual([]);
  });

  it('rejects an unknown category', async () => {
    await expect(
      useCase.execute({
        userId: 'u1',
        productId: product.id,
        categoryId: 'missing',
      }),
    ).rejects.toThrow(ProductCategoryNotFoundException);
    expect(product.categoryId).toBe('c1');
    expect(eventBus.published).toEqual([]);
  });

  it('propagates domain validation', async () => {
    await expect(
      useCase.execute({ userId: 'u1', productId: product.id, quantity: -1 }),
    ).rejects.toThrow(InvalidProductQuantityException);
    expect(eventBus.published).toEqual([]);
  });
});
