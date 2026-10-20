import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import {
  GetCropTopArticlesUseCase,
  GetTopArticleSettingsUseCase,
  SetCropTopArticlesUseCase,
  UpdateTopArticleSettingsUseCase,
} from '../../application/use-cases';
import {
  AdminArticleCropParamsDto,
  SetCropTopArticlesDto,
  UpdateTopArticleSettingsDto,
} from './dto';
import {
  CropTopArticlesResponse,
  TopArticleSettingsResponse,
} from './responses/top-articles.response';

/** Top articles management for ADMIN accounts (role checked by the use cases). */
@Controller('admin/knowledge')
@UseGuards(AccessTokenGuard)
export class AdminTopArticleController {
  constructor(
    private readonly getSettings: GetTopArticleSettingsUseCase,
    private readonly updateSettings: UpdateTopArticleSettingsUseCase,
    private readonly getTopArticles: GetCropTopArticlesUseCase,
    private readonly setTopArticles: SetCropTopArticlesUseCase,
  ) {}

  @Get('settings')
  async settings(
    @CurrentUser() caller: TAccessTokenPayload,
  ): Promise<TopArticleSettingsResponse> {
    return this.getSettings.execute({ userId: caller.userId });
  }

  @Put('settings')
  async updateSettingsOf(
    @CurrentUser() caller: TAccessTokenPayload,
    @Body() dto: UpdateTopArticleSettingsDto,
  ): Promise<TopArticleSettingsResponse> {
    return this.updateSettings.execute({
      userId: caller.userId,
      limit: dto.limit,
    });
  }

  @Get('crops/:cropSlug/top-articles')
  async topArticles(
    @CurrentUser() caller: TAccessTokenPayload,
    @Param() params: AdminArticleCropParamsDto,
  ): Promise<CropTopArticlesResponse> {
    return this.getTopArticles.execute({
      userId: caller.userId,
      cropSlug: params.cropSlug,
    });
  }

  @Put('crops/:cropSlug/top-articles')
  async setTopArticlesOf(
    @CurrentUser() caller: TAccessTokenPayload,
    @Param() params: AdminArticleCropParamsDto,
    @Body() dto: SetCropTopArticlesDto,
  ): Promise<CropTopArticlesResponse> {
    return this.setTopArticles.execute({
      userId: caller.userId,
      cropSlug: params.cropSlug,
      articleSlugs: dto.articleSlugs,
    });
  }
}
