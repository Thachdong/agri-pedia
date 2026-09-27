import { Controller, Get } from '@nestjs/common';
import { ListCategoriesUseCase } from '../../application/use-cases';
import { ListCategoriesResponse } from './responses/list-categories.response';

@Controller('categories')
export class CategoryController {
  constructor(private readonly listCategories: ListCategoriesUseCase) {}

  @Get()
  async list(): Promise<ListCategoriesResponse> {
    const { items } = await this.listCategories.execute();
    return { items: items.map(({ id, name }) => ({ id, name })) };
  }
}
