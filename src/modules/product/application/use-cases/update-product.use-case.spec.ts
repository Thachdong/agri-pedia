import { IUserQueryPort, TUserRoleSummary } from '@modules/user/contracts';
import { InMemoryUnitOfWork } from '@shared/database';
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
    const userQuery: IUserQueryPort = {
      findByIdentifier: async () => null,
      findRoleById: async () => seller,
    };
    useCase = new UpdateProductUseCase(
      products,
      categories,
      userQuery,
      new InMemoryUnitOfWork(),
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
  });

  it('rejects an unknown product', async () => {
    await expect(
      useCase.execute({ userId: 'u1', productId: 'missing' }),
    ).rejects.toThrow(ProductNotFoundException);
  });

  it('rejects a product of another distributor', async () => {
    seller = { userId: 'u2', role: 'DISTRIBUTOR', isActive: true };

    await expect(
      useCase.execute({ userId: 'u2', productId: product.id, price: 1 }),
    ).rejects.toThrow(ProductNotOwnerException);
    expect(product.price).toBe(350000);
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
  });

  it('propagates domain validation', async () => {
    await expect(
      useCase.execute({ userId: 'u1', productId: product.id, quantity: -1 }),
    ).rejects.toThrow(InvalidProductQuantityException);
  });
});
