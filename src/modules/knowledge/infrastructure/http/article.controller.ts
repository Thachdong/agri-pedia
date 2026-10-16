import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import {
  GetArticleSitemapUseCase,
  GetArticleUseCase,
  ListArticleCropsUseCase,
  ListArticlesUseCase,
} from '../../application/use-cases';
import {
  ArticleParamsDto,
  DEFAULT_ARTICLE_PAGE_SIZE,
  ListArticlesQueryDto,
} from './dto';
import {
  ArticleDetailResponse,
  ArticleSitemapResponse,
  ListArticleCropsResponse,
  ListArticlesResponse,
} from './responses/article.response';

/** Short HTTP cache: the client caches pages itself and is told when they change. */
const CACHE_CONTROL = 'public, max-age=60';

/** Public disease articles: no login required. */
@Controller('knowledge/articles')
export class ArticleController {
  constructor(
    private readonly listArticleCrops: ListArticleCropsUseCase,
    private readonly listArticles: ListArticlesUseCase,
    private readonly getArticle: GetArticleUseCase,
    private readonly getArticleSitemap: GetArticleSitemapUseCase,
  ) {}

  @Get('crops')
  @Header('Cache-Control', CACHE_CONTROL)
  async crops(): Promise<ListArticleCropsResponse> {
    return this.listArticleCrops.execute();
  }

  @Get('sitemap')
  @Header('Cache-Control', CACHE_CONTROL)
  async sitemap(): Promise<ArticleSitemapResponse> {
    return this.getArticleSitemap.execute();
  }

  @Get()
  @Header('Cache-Control', CACHE_CONTROL)
  async list(
    @Query() query: ListArticlesQueryDto,
  ): Promise<ListArticlesResponse> {
    return this.listArticles.execute({
      crop: query.crop,
      category: query.category,
      cursor: query.cursor,
      limit: query.limit ?? DEFAULT_ARTICLE_PAGE_SIZE,
    });
  }

  @Get(':cropSlug/:slug')
  @Header('Cache-Control', CACHE_CONTROL)
  async detail(
    @Param() params: ArticleParamsDto,
  ): Promise<ArticleDetailResponse> {
    return this.getArticle.execute({
      cropSlug: params.cropSlug,
      slug: params.slug,
    });
  }
}
