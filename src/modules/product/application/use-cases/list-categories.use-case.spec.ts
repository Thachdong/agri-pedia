import { InMemoryCategoryRepository } from '../ports/fakes';
import { ListCategoriesUseCase } from './list-categories.use-case';

describe('ListCategoriesUseCase', () => {
  it('returns every category ordered by name', async () => {
    const categories = new InMemoryCategoryRepository();
    categories.add(
      { id: 'c2', name: 'Giống thủy sản' },
      { id: 'c1', name: 'Giống cây trồng' },
    );

    await expect(
      new ListCategoriesUseCase(categories).execute(),
    ).resolves.toEqual({
      items: [
        { id: 'c1', name: 'Giống cây trồng' },
        { id: 'c2', name: 'Giống thủy sản' },
      ],
    });
  });

  it('returns an empty list when there is no category', async () => {
    await expect(
      new ListCategoriesUseCase(new InMemoryCategoryRepository()).execute(),
    ).resolves.toEqual({ items: [] });
  });
});
