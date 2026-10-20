import { SuggestionQuotaExceededException } from '../exceptions/suggestion-quota-exceeded.exception';
import { ProductSuggestionSettings } from './product-suggestion-settings.entity';
import { ProductSuggestionUsage } from './product-suggestion-usage.entity';

function settings(
  invalidImageLimit: number,
  notFoundLimit: number,
): ProductSuggestionSettings {
  return ProductSuggestionSettings.restore({
    invalidImageLimit,
    notFoundLimit,
  });
}

describe('ProductSuggestionUsage', () => {
  it('starts empty with the whole quota left', () => {
    const usage = ProductSuggestionUsage.start('user-1');

    expect(usage.used).toBe(0);
    expect(usage.bonusUsed).toBe(0);
    expect(usage.remaining(settings(2, 1))).toBe(2);
  });

  it('reserve takes one from the visible quota until it is used up', () => {
    const usage = ProductSuggestionUsage.start('user-1');
    const limits = settings(2, 0);

    usage.reserve(limits);
    usage.reserve(limits);

    expect(usage.remaining(limits)).toBe(0);
    expect(() => usage.reserve(limits)).toThrow(
      SuggestionQuotaExceededException,
    );
    expect(usage.used).toBe(2);
  });

  it('refund gives a reservation back', () => {
    const usage = ProductSuggestionUsage.start('user-1');
    const limits = settings(2, 0);
    usage.reserve(limits);

    usage.refund();

    expect(usage.used).toBe(0);
  });

  it('settleNotFound moves the reservation to the bonus while it has room, then keeps it charged', () => {
    const usage = ProductSuggestionUsage.start('user-1');
    const limits = settings(5, 1);

    usage.reserve(limits);
    usage.settleNotFound(limits);
    expect({ used: usage.used, bonusUsed: usage.bonusUsed }).toEqual({
      used: 0,
      bonusUsed: 1,
    });

    usage.reserve(limits);
    usage.settleNotFound(limits);
    expect({ used: usage.used, bonusUsed: usage.bonusUsed }).toEqual({
      used: 1,
      bonusUsed: 1,
    });
  });

  it('remaining is 0 when the limit was lowered below what is used', () => {
    const usage = ProductSuggestionUsage.restore({
      userId: 'user-1',
      used: 10,
      bonusUsed: 0,
    });

    expect(usage.remaining(settings(5, 0))).toBe(0);
  });
});
