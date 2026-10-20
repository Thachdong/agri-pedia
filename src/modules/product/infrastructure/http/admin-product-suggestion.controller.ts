import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import {
  GetProductSuggestionSettingsUseCase,
  ListProductSuggestionMissesUseCase,
  UpdateProductSuggestionSettingsUseCase,
} from '../../application/use-cases';
import {
  AdminPageQueryDto,
  DEFAULT_ADMIN_PAGE_SIZE,
  UpdateProductSuggestionSettingsDto,
} from './dto';
import {
  ListProductSuggestionMissesResponse,
  ProductSuggestionSettingsResponse,
} from './responses/product-suggestion-admin.response';

/** Product suggestion quotas and misses for ADMIN accounts (role checked by the use cases). */
@Controller('admin/product-suggestion')
@UseGuards(AccessTokenGuard)
export class AdminProductSuggestionController {
  constructor(
    private readonly getSettings: GetProductSuggestionSettingsUseCase,
    private readonly updateSettings: UpdateProductSuggestionSettingsUseCase,
    private readonly listMisses: ListProductSuggestionMissesUseCase,
  ) {}

  @Get('settings')
  async get(
    @CurrentUser() caller: TAccessTokenPayload,
  ): Promise<ProductSuggestionSettingsResponse> {
    return this.getSettings.execute({ userId: caller.userId });
  }

  @Put('settings')
  async update(
    @CurrentUser() caller: TAccessTokenPayload,
    @Body() dto: UpdateProductSuggestionSettingsDto,
  ): Promise<ProductSuggestionSettingsResponse> {
    return this.updateSettings.execute({
      userId: caller.userId,
      invalidImageLimit: dto.invalidImageLimit,
      notFoundLimit: dto.notFoundLimit,
    });
  }

  @Get('misses')
  async misses(
    @CurrentUser() caller: TAccessTokenPayload,
    @Query() query: AdminPageQueryDto,
  ): Promise<ListProductSuggestionMissesResponse> {
    return this.listMisses.execute({
      userId: caller.userId,
      page: query.page ?? 1,
      limit: query.limit ?? DEFAULT_ADMIN_PAGE_SIZE,
    });
  }
}
