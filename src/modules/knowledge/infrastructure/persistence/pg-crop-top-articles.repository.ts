import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { ICropTopArticlesRepository } from '../../application/ports';
import { CropTopArticles } from '../../domain';
import { CropTopArticleOrmEntity } from './crop-top-article.orm-entity';

@Injectable()
export class PgCropTopArticlesRepository
  extends TypeOrmRepositoryBase<CropTopArticleOrmEntity>
  implements ICropTopArticlesRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, CropTopArticleOrmEntity);
  }

  async findByCrop(cropType: string): Promise<CropTopArticles> {
    const rows = await this.repository.find({
      where: { cropType },
      order: { position: 'ASC' },
    });
    return CropTopArticles.restore({
      cropType,
      articleIds: rows.map((row) => row.articleId),
    });
  }

  /** Must run inside a transaction (delete + insert). */
  async save(top: CropTopArticles): Promise<void> {
    await this.repository.delete({ cropType: top.cropType });
    if (top.articleIds.length === 0) return;
    await this.repository.insert(
      top.articleIds.map((articleId, position) => ({
        cropType: top.cropType,
        position,
        articleId,
      })),
    );
  }
}
