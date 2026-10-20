import {
  AdminArticleCropResponse,
  AdminArticleSummaryResponse,
} from './admin-article.response';
import {
  ArticleCropResponse,
  ArticleListItemResponse,
} from './article.response';

export class TopArticleSettingsResponse {
  /** Top articles an admin may choose per crop. */
  limit: number;
}

export class CropTopArticlesResponse {
  crop: AdminArticleCropResponse;
  /** Top articles an admin may choose per crop. */
  limit: number;
  /** In order; articles unpublished since they were chosen stay listed (`isPublished` false) but are hidden from the public list. */
  articles: AdminArticleSummaryResponse[];
}

export class ListTopArticlesResponse {
  crop: ArticleCropResponse;
  /** In the admin's order, published only, at most `limit`. */
  articles: ArticleListItemResponse[];
}
