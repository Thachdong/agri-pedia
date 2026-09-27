import { EProductStatus } from '../enums/product-status.enum';
import { EProductUnit } from '../enums/product-unit.enum';
import { InvalidProductPriceException } from '../exceptions/invalid-product-price.exception';
import { InvalidProductQuantityException } from '../exceptions/invalid-product-quantity.exception';
import { Product, TCreateProductProps } from './product.entity';

const input: TCreateProductProps = {
  userId: 'u1',
  name: '  Phân NPK  ',
  description: ' Bao 50kg ',
  price: 350000,
  quantity: 20,
  unit: EProductUnit.BAG,
  categoryId: 'c1',
};

describe('Product.create', () => {
  it('creates an ACTIVE product with trimmed text and a new id', () => {
    const product = Product.create(input);

    expect(product.id).toEqual(expect.any(String));
    expect(product.status).toBe(EProductStatus.ACTIVE);
    expect(product.name).toBe('Phân NPK');
    expect(product.description).toBe('Bao 50kg');
    expect(product).toMatchObject({
      userId: 'u1',
      price: 350000,
      quantity: 20,
      unit: EProductUnit.BAG,
      categoryId: 'c1',
    });
  });

  it('accepts price 0 and quantity 0', () => {
    const product = Product.create({ ...input, price: 0, quantity: 0 });

    expect(product.price).toBe(0);
    expect(product.quantity).toBe(0);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects price %p',
    (price) => {
      expect(() => Product.create({ ...input, price })).toThrow(
        InvalidProductPriceException,
      );
    },
  );

  it.each([-1, 1.5, Number.NaN])('rejects quantity %p', (quantity) => {
    expect(() => Product.create({ ...input, quantity })).toThrow(
      InvalidProductQuantityException,
    );
  });
});

describe('Product.restore', () => {
  it('rebuilds a product without validation', () => {
    const product = Product.restore('p1', {
      ...input,
      status: EProductStatus.OUT_OF_STOCK,
    });

    expect(product.id).toBe('p1');
    expect(product.status).toBe(EProductStatus.OUT_OF_STOCK);
  });
});
