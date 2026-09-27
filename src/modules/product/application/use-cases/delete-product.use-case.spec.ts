import { IUserQueryPort, TUserRoleSummary } from '@modules/user/contracts';
import { InMemoryUnitOfWork } from '@shared/database';
import {
  EProductUnit,
  Product,
  ProductNotFoundException,
  ProductNotOwnerException,
  ProductSellerNotAllowedException,
} from '../../domain';
import { InMemoryProductRepository } from '../ports/fakes';
import { DeleteProductUseCase } from './delete-product.use-case';

describe('DeleteProductUseCase', () => {
  let products: InMemoryProductRepository;
  let seller: TUserRoleSummary | null;
  let product: Product;
  let useCase: DeleteProductUseCase;

  beforeEach(async () => {
    products = new InMemoryProductRepository();
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
    useCase = new DeleteProductUseCase(
      products,
      userQuery,
      new InMemoryUnitOfWork(),
    );
  });

  it('soft-deletes the product: row kept, no longer found', async () => {
    await useCase.execute({ userId: 'u1', productId: product.id });

    expect(products.items.get(product.id)?.deletedAt).toBeInstanceOf(Date);
    expect(await products.findById(product.id)).toBeNull();
  });

  it('rejects a product already deleted', async () => {
    await useCase.execute({ userId: 'u1', productId: product.id });

    await expect(
      useCase.execute({ userId: 'u1', productId: product.id }),
    ).rejects.toThrow(ProductNotFoundException);
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
      useCase.execute({ userId: 'u1', productId: product.id }),
    ).rejects.toThrow(ProductSellerNotAllowedException);
    expect(product.deletedAt).toBeNull();
  });

  it('rejects an unknown product', async () => {
    await expect(
      useCase.execute({ userId: 'u1', productId: 'missing' }),
    ).rejects.toThrow(ProductNotFoundException);
  });

  it('rejects a product of another distributor', async () => {
    seller = { userId: 'u2', role: 'DISTRIBUTOR', isActive: true };

    await expect(
      useCase.execute({ userId: 'u2', productId: product.id }),
    ).rejects.toThrow(ProductNotOwnerException);
    expect(product.deletedAt).toBeNull();
  });
});
