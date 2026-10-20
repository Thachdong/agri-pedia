import { InvalidSuggestionSettingsException } from '../exceptions/invalid-suggestion-settings.exception';
import { ProductSuggestionSettings } from './product-suggestion-settings.entity';

describe('ProductSuggestionSettings', () => {
  it('defaults to 50 suggestions + 50 not-found bonus', () => {
    const settings = ProductSuggestionSettings.defaults();

    expect(settings.invalidImageLimit).toBe(50);
    expect(settings.notFoundLimit).toBe(50);
  });

  it('update replaces every setting; a bonus of 0 is allowed', () => {
    const settings = ProductSuggestionSettings.defaults();

    settings.update({ invalidImageLimit: 20, notFoundLimit: 0 });

    expect(settings.invalidImageLimit).toBe(20);
    expect(settings.notFoundLimit).toBe(0);
  });

  it.each([
    ['invalidImageLimit', 0],
    ['invalidImageLimit', 10001],
    ['invalidImageLimit', 2.5],
    ['notFoundLimit', -1],
    ['notFoundLimit', 10001],
  ])('update rejects %s = %p', (field, value) => {
    const settings = ProductSuggestionSettings.defaults();

    expect(() =>
      settings.update({
        invalidImageLimit: 50,
        notFoundLimit: 50,
        [field]: value,
      }),
    ).toThrow(InvalidSuggestionSettingsException);
  });
});
