import { defineApiDocs } from '@shared/swagger';
import { CategoryController } from './category.controller';

defineApiDocs(CategoryController, {
  tag: 'Category',
  operations: {
    list: {
      summary: 'List product categories, ordered by name',
    },
  },
});
