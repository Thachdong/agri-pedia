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

  it('has no AI model until an admin picks one (env model is used)', () => {
    expect(ProductSuggestionSettings.defaults().aiModel).toBeNull();
  });

  it('updateAiModel replaces the model and keeps the quotas', () => {
    const settings = ProductSuggestionSettings.restore({
      invalidImageLimit: 20,
      notFoundLimit: 5,
    });

    settings.updateAiModel('gemini-2.5-flash-lite');

    expect(settings.aiModel).toBe('gemini-2.5-flash-lite');
    expect(settings.invalidImageLimit).toBe(20);
  });

  it('updateAiModel(null) goes back to the env model', () => {
    const settings = ProductSuggestionSettings.restore(
      { invalidImageLimit: 20, notFoundLimit: 5 },
      'gemini-2.5-flash-lite',
    );

    settings.updateAiModel(null);

    expect(settings.aiModel).toBeNull();
  });

  it('update keeps the AI model', () => {
    const settings = ProductSuggestionSettings.restore(
      { invalidImageLimit: 20, notFoundLimit: 5 },
      'gemini-2.5-flash-lite',
    );

    settings.update({ invalidImageLimit: 30, notFoundLimit: 5 });

    expect(settings.aiModel).toBe('gemini-2.5-flash-lite');
  });

  it.each(['', 'gemini flash', '-gemini', 'models/gemini', 'g'.repeat(101)])(
    'updateAiModel rejects %j and keeps the previous model',
    (model) => {
      const settings = ProductSuggestionSettings.defaults();

      expect(() => settings.updateAiModel(model)).toThrow(
        InvalidSuggestionSettingsException,
      );
      expect(settings.aiModel).toBeNull();
    },
  );
});
