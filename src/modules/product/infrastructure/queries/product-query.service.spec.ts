import { InMemoryProductRepository } from '../../application/ports/fakes';
import { EProductStatus, EProductUnit, Product } from '../../domain';
import { ProductQueryService } from './product-query.service';

const newProduct = () =>
  Product.create({
    userId: 'distributor-1',
    name: 'Phân NPK',
    description: 'Bao 50kg',
    price: 350000,
    quantity: 20,
    unit: EProductUnit.BAG,
    categoryId: 'c1',
  });

describe('ProductQueryService.findOwnerById', () => {
  let products: InMemoryProductRepository;
  let service: ProductQueryService;

  beforeEach(() => {
    products = new InMemoryProductRepository();
    service = new ProductQueryService(products);
  });

  it('returns the seller of an ACTIVE product', async () => {
    const product = newProduct();
    await products.save(product);

    await expect(service.findOwnerById(product.id)).resolves.toEqual({
      productId: product.id,
      userId: 'distributor-1',
      isActive: true,
    });
  });

  it.each([EProductStatus.INACTIVE, EProductStatus.OUT_OF_STOCK])(
    'reports a %s product as not active',
    async (status) => {
      const product = newProduct();
      product.update({ status });
      await products.save(product);

      await expect(service.findOwnerById(product.id)).resolves.toMatchObject({
        isActive: false,
      });
    },
  );

  it('returns null for a deleted product', async () => {
    const product = newProduct();
    product.delete();
    await products.save(product);

    await expect(service.findOwnerById(product.id)).resolves.toBeNull();
  });

  it('returns null for an unknown id', async () => {
    await expect(service.findOwnerById('missing')).resolves.toBeNull();
  });
});
