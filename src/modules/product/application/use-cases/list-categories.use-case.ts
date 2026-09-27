import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  ICategoryRepository,
} from '../ports/category.repository';

export type TListCategoriesOutput = {
  items: { id: string; name: string }[];
};

/** All product categories, ordered by name. */
@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: ICategoryRepository,
  ) {}

  async execute(): Promise<TListCategoriesOutput> {
    const categories = await this.categories.findAll();
    return { items: categories.map(({ id, name }) => ({ id, name })) };
  }
}
