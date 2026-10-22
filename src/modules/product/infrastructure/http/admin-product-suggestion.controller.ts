import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import {
  GetProductSuggestionAiModelUseCase,
  GetProductSuggestionSettingsUseCase,
  ListProductSuggestionMissesUseCase,
  UpdateProductSuggestionAiModelUseCase,
  UpdateProductSuggestionSettingsUseCase,
} from '../../application/use-cases';
import {
  AdminPageQueryDto,
  DEFAULT_ADMIN_PAGE_SIZE,
  UpdateProductSuggestionAiModelDto,
  UpdateProductSuggestionSettingsDto,
} from './dto';
import {
  ListProductSuggestionMissesResponse,
  ProductSuggestionAiModelResponse,
  ProductSuggestionSettingsResponse,
} from './responses/product-suggestion-admin.response';

/** Product suggestion quotas, AI model and misses for ADMIN accounts (role checked by the use cases). */
@Controller('admin/product-suggestion')
@UseGuards(AccessTokenGuard)
export class AdminProductSuggestionController {
  constructor(
    private readonly getSettings: GetProductSuggestionSettingsUseCase,
    private readonly updateSettings: UpdateProductSuggestionSettingsUseCase,
    private readonly listMisses: ListProductSuggestionMissesUseCase,
    private readonly getAiModel: GetProductSuggestionAiModelUseCase,
    private readonly updateAiModel: UpdateProductSuggestionAiModelUseCase,
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

  @Get('ai-model')
  async getModel(
    @CurrentUser() caller: TAccessTokenPayload,
  ): Promise<ProductSuggestionAiModelResponse> {
    return this.getAiModel.execute({ userId: caller.userId });
  }

  @Put('ai-model')
  async updateModel(
    @CurrentUser() caller: TAccessTokenPayload,
    @Body() dto: UpdateProductSuggestionAiModelDto,
  ): Promise<ProductSuggestionAiModelResponse> {
    return this.updateAiModel.execute({
      userId: caller.userId,
      model: dto.model,
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
