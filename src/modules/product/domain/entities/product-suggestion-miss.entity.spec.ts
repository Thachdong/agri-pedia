import { ProductSuggestionMiss } from './product-suggestion-miss.entity';

describe('ProductSuggestionMiss', () => {
  it('keeps the name as read and its normalized form', () => {
    const miss = ProductSuggestionMiss.create({
      userId: 'user-1',
      detectedName: ' Thuốc Đặc Trị 5SC ',
    });

    expect(miss.id).toBeDefined();
    expect(miss.userId).toBe('user-1');
    expect(miss.detectedName).toBe('Thuốc Đặc Trị 5SC');
    expect(miss.normalizedName).toBe('thuoc dac tri 5sc');
  });
});
