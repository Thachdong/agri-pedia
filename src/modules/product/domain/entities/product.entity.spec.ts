import { EProductStatus } from '../enums/product-status.enum';
import { EProductUnit } from '../enums/product-unit.enum';
import { InvalidProductPriceException } from '../exceptions/invalid-product-price.exception';
import { InvalidProductQuantityException } from '../exceptions/invalid-product-quantity.exception';
import { ProductNotOwnerException } from '../exceptions/product-not-owner.exception';
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
    expect(product.deletedAt).toBeNull();
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
      deletedAt: null,
    });

    expect(product.id).toBe('p1');
    expect(product.status).toBe(EProductStatus.OUT_OF_STOCK);
  });
});

describe('Product.assertOwnedBy', () => {
  it('passes for the seller', () => {
    expect(() => Product.create(input).assertOwnedBy('u1')).not.toThrow();
  });

  it('throws ProductNotOwnerException for another user', () => {
    expect(() => Product.create(input).assertOwnedBy('u2')).toThrow(
      ProductNotOwnerException,
    );
  });
});

describe('Product.update', () => {
  it('changes only the given fields and trims text', () => {
    const product = Product.create(input);

    product.update({
      name: ' Phân DAP ',
      price: 400000,
      status: EProductStatus.OUT_OF_STOCK,
    });

    expect(product).toMatchObject({
      userId: 'u1',
      name: 'Phân DAP',
      description: 'Bao 50kg',
      price: 400000,
      quantity: 20,
      unit: EProductUnit.BAG,
      categoryId: 'c1',
      status: EProductStatus.OUT_OF_STOCK,
    });
  });

  it('changes every field', () => {
    const product = Product.create(input);

    product.update({
      name: 'A',
      description: ' B ',
      price: 0,
      quantity: 0,
      unit: EProductUnit.KG,
      categoryId: 'c2',
      status: EProductStatus.INACTIVE,
    });

    expect(product).toMatchObject({
      name: 'A',
      description: 'B',
      price: 0,
      quantity: 0,
      unit: EProductUnit.KG,
      categoryId: 'c2',
      status: EProductStatus.INACTIVE,
    });
  });

  it('keeps everything when no field is given', () => {
    const product = Product.create(input);

    product.update({});

    expect(product.name).toBe('Phân NPK');
    expect(product.status).toBe(EProductStatus.ACTIVE);
  });

  it.each([-1, Number.NaN])('rejects price %p', (price) => {
    const product = Product.create(input);

    expect(() => product.update({ price })).toThrow(
      InvalidProductPriceException,
    );
    expect(product.price).toBe(350000);
  });

  it.each([-1, 1.5])('rejects quantity %p', (quantity) => {
    const product = Product.create(input);

    expect(() => product.update({ quantity })).toThrow(
      InvalidProductQuantityException,
    );
    expect(product.quantity).toBe(20);
  });
});

describe('Product.delete', () => {
  it('sets deletedAt and keeps the other fields', () => {
    const product = Product.create(input);
    const before = Date.now();

    product.delete();

    expect(product.deletedAt).toBeInstanceOf(Date);
    expect(product.deletedAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(product.status).toBe(EProductStatus.ACTIVE);
    expect(product.name).toBe('Phân NPK');
  });
});
