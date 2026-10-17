import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import {
  CreateArticleUseCase,
  GetAdminArticleUseCase,
  ListAdminArticleTargetsUseCase,
  PublishArticleUseCase,
  TAdminArticleImageInput,
  UnpublishArticleUseCase,
  UpdateArticleUseCase,
} from '../../application/use-cases';
import {
  AdminArticleCodeParamsDto,
  AdminArticleCropParamsDto,
  AdminArticleImageDto,
  CreateArticleDto,
  UpdateArticleDto,
} from './dto';
import {
  AdminArticleDetailResponse,
  ArticleVisibilityResponse,
  CreateArticleResponse,
  ListAdminArticleTargetsResponse,
  UpdateArticleResponse,
} from './responses/admin-article.response';

/** Article management for ADMIN accounts (role checked by the use cases). */
@Controller('admin/knowledge')
@UseGuards(AccessTokenGuard)
export class AdminArticleController {
  constructor(
    private readonly listTargets: ListAdminArticleTargetsUseCase,
    private readonly getArticle: GetAdminArticleUseCase,
    private readonly createArticle: CreateArticleUseCase,
    private readonly updateArticle: UpdateArticleUseCase,
    private readonly unpublishArticle: UnpublishArticleUseCase,
    private readonly publishArticle: PublishArticleUseCase,
  ) {}

  @Get('crops/:cropSlug/articles')
  async targets(
    @CurrentUser() caller: TAccessTokenPayload,
    @Param() params: AdminArticleCropParamsDto,
  ): Promise<ListAdminArticleTargetsResponse> {
    return this.listTargets.execute({
      userId: caller.userId,
      cropSlug: params.cropSlug,
    });
  }

  @Get('articles/:code')
  async detail(
    @CurrentUser() caller: TAccessTokenPayload,
    @Param() params: AdminArticleCodeParamsDto,
  ): Promise<AdminArticleDetailResponse> {
    return this.getArticle.execute({
      userId: caller.userId,
      code: params.code,
    });
  }

  @Post('articles')
  async create(
    @CurrentUser() caller: TAccessTokenPayload,
    @Body() dto: CreateArticleDto,
  ): Promise<CreateArticleResponse> {
    return this.createArticle.execute({
      userId: caller.userId,
      code: dto.code,
      slug: dto.slug,
      title: dto.title,
      summary: dto.summary,
      markdown: dto.markdown,
      cover: dto.cover,
      images: dto.images.map(toImageInput),
      sources: dto.sources.map(({ title, url }) => ({ title, url })),
    });
  }

  @Put('articles/:code')
  async update(
    @CurrentUser() caller: TAccessTokenPayload,
    @Param() params: AdminArticleCodeParamsDto,
    @Body() dto: UpdateArticleDto,
  ): Promise<UpdateArticleResponse> {
    return this.updateArticle.execute({
      userId: caller.userId,
      code: params.code,
      title: dto.title,
      summary: dto.summary,
      markdown: dto.markdown,
      cover: dto.cover,
      images: dto.images.map(toImageInput),
      sources: dto.sources.map(({ title, url }) => ({ title, url })),
    });
  }

  @Post('articles/:code/unpublish')
  @HttpCode(200)
  async unpublish(
    @CurrentUser() caller: TAccessTokenPayload,
    @Param() params: AdminArticleCodeParamsDto,
  ): Promise<ArticleVisibilityResponse> {
    return this.unpublishArticle.execute({
      userId: caller.userId,
      code: params.code,
    });
  }

  @Post('articles/:code/publish')
  @HttpCode(200)
  async publish(
    @CurrentUser() caller: TAccessTokenPayload,
    @Param() params: AdminArticleCodeParamsDto,
  ): Promise<ArticleVisibilityResponse> {
    return this.publishArticle.execute({
      userId: caller.userId,
      code: params.code,
    });
  }
}

function toImageInput(image: AdminArticleImageDto): TAdminArticleImageInput {
  return {
    file: image.file,
    tmpKey: image.tmpKey,
    alt: image.alt,
    caption: image.caption ?? null,
    credit: {
      source: image.credit.source,
      author: image.credit.author,
      license: image.credit.license,
      url: image.credit.url,
    },
  };
}
