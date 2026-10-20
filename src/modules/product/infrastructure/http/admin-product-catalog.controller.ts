import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import {
  CreateCatalogItemUseCase,
  DeleteCatalogItemUseCase,
  ListCatalogItemsUseCase,
  UpdateCatalogItemUseCase,
} from '../../application/use-cases';
import {
  CreateCatalogItemDto,
  DEFAULT_ADMIN_PAGE_SIZE,
  ListCatalogItemsQueryDto,
  UpdateCatalogItemDto,
} from './dto';
import {
  CatalogItemResponse,
  ListCatalogItemsResponse,
} from './responses/catalog-item.response';

/** Product catalog (knowledge base of product suggestions) for ADMIN accounts (role checked by the use cases). */
@Controller('admin/product-catalog')
@UseGuards(AccessTokenGuard)
export class AdminProductCatalogController {
  constructor(
    private readonly listItems: ListCatalogItemsUseCase,
    private readonly createItem: CreateCatalogItemUseCase,
    private readonly updateItem: UpdateCatalogItemUseCase,
    private readonly deleteItem: DeleteCatalogItemUseCase,
  ) {}

  @Get()
  async list(
    @CurrentUser() caller: TAccessTokenPayload,
    @Query() query: ListCatalogItemsQueryDto,
  ): Promise<ListCatalogItemsResponse> {
    return this.listItems.execute({
      userId: caller.userId,
      search: query.search,
      page: query.page ?? 1,
      limit: query.limit ?? DEFAULT_ADMIN_PAGE_SIZE,
    });
  }

  @Post()
  async create(
    @CurrentUser() caller: TAccessTokenPayload,
    @Body() dto: CreateCatalogItemDto,
  ): Promise<CatalogItemResponse> {
    return this.createItem.execute({
      userId: caller.userId,
      name: dto.name,
      description: dto.description,
    });
  }

  @Patch(':catalogItemId')
  async update(
    @CurrentUser() caller: TAccessTokenPayload,
    @Param('catalogItemId', ParseUUIDPipe) catalogItemId: string,
    @Body() dto: UpdateCatalogItemDto,
  ): Promise<CatalogItemResponse> {
    return this.updateItem.execute({
      userId: caller.userId,
      catalogItemId,
      name: dto.name,
      description: dto.description,
    });
  }

  @Delete(':catalogItemId')
  async delete(
    @CurrentUser() caller: TAccessTokenPayload,
    @Param('catalogItemId', ParseUUIDPipe) catalogItemId: string,
  ): Promise<null> {
    await this.deleteItem.execute({ userId: caller.userId, catalogItemId });
    return null;
  }
}
