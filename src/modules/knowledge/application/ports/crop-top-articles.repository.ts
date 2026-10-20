import { CropTopArticles } from '../../domain';

export interface ICropTopArticlesRepository {
  /** Top articles of the crop; empty when none were chosen. */
  findByCrop(cropType: string): Promise<CropTopArticles>;
  /** Replaces the crop's list. */
  save(top: CropTopArticles): Promise<void>;
}

export const CROP_TOP_ARTICLES_REPOSITORY = Symbol(
  'CROP_TOP_ARTICLES_REPOSITORY',
);
