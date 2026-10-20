import { normalizeProductName } from './normalize-product-name';

describe('normalizeProductName', () => {
  it.each([
    ['Anvil 5SC', 'anvil 5sc'],
    ['  Anvil   5SC®  ', 'anvil 5sc'],
    ['Thuốc Đặc Trị', 'thuoc dac tri'],
    ['TILT-SUPER 300EC', 'tilt super 300ec'],
    ['đạm Phú Mỹ', 'dam phu my'],
    ['!!!', ''],
  ])('%p -> %p', (raw, expected) => {
    expect(normalizeProductName(raw)).toBe(expected);
  });
});
