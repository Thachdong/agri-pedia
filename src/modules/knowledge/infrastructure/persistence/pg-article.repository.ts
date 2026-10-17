import { Injectable } from '@nestjs/common';
import { Brackets, DataSource, In } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import {
  IArticleRepository,
  TArticlePageQuery,
  TArticleRef,
} from '../../application/ports';
import { Article, EArticleStatus } from '../../domain';
import { ArticleMapper } from './article.mapper';
import { ArticleOrmEntity } from './article.orm-entity';

/** Escapes LIKE wildcards (`_` is common in disease codes). */
const likeLiteral = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

@Injectable()
export class PgArticleRepository
  extends TypeOrmRepositoryBase<ArticleOrmEntity>
  implements IArticleRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, ArticleOrmEntity);
  }

  async findAllForSeed(): Promise<Article[]> {
    const rows = await this.repository.find();
    return rows.map((row) => ArticleMapper.toDomain(row));
  }

  async replaceArticles(save: Article[], deleteIds: string[]): Promise<void> {
    // Delete first: a renamed article may take the slug of a deleted one.
    if (deleteIds.length > 0)
      await this.repository.delete({ id: In(deleteIds) });
    if (save.length > 0) {
      await this.repository.upsert(
        save.map((article) => ArticleMapper.toOrm(article)),
        ['id'],
      );
    }
  }

  async findReferencing(diseaseCodes: string[]): Promise<TArticleRef[]> {
    if (diseaseCodes.length === 0) return [];
    const query = this.repository
      .createQueryBuilder('a')
      .select(['a.id', 'a.cropType', 'a.slug']);
    query.where(
      new Brackets((where) => {
        diseaseCodes.forEach((code, index) => {
          const literal = likeLiteral(code);
          where
            .orWhere(`a.markdown LIKE :link${index}`, {
              [`link${index}`]: `%](/diseases/${literal})%`,
            })
            .orWhere(`a.markdown LIKE :card${index}`, {
              [`card${index}`]: `%::disease-card{code="${literal}"}%`,
            });
        });
      }),
    );
    const rows = await query.getMany();
    return rows.map(({ cropType, slug }) => ({ cropType, slug }));
  }

  async listByCrop(cropType: string): Promise<Article[]> {
    const rows = await this.repository.findBy({ cropType });
    return rows.map((row) => ArticleMapper.toDomain(row));
  }

  async countPublishedByCrop(): Promise<Map<string, number>> {
    const rows = await this.repository
      .createQueryBuilder('a')
      .select('a.crop_type', 'cropType')
      .addSelect('COUNT(*)::int', 'count')
      .where('a.is_published')
      .groupBy('a.crop_type')
      .getRawMany<{ cropType: string; count: number }>();
    return new Map(rows.map((row) => [row.cropType, row.count]));
  }

  async listPublishedPage(
    cropType: string,
    query: TArticlePageQuery,
  ): Promise<Article[]> {
    if (query.diseaseCodes?.length === 0) return [];
    const builder = this.repository
      .createQueryBuilder('a')
      .where('a.crop_type = :cropType', { cropType })
      .andWhere('a.is_published');
    if (query.diseaseCodes) {
      builder.andWhere('a.disease_code IN (:...codes)', {
        codes: query.diseaseCodes,
      });
    }
    if (query.after) {
      // Row comparison follows the column's Vietnamese collation, like ORDER BY.
      builder.andWhere('(a.title, a.id) > (:title, :id::uuid)', {
        title: query.after.title,
        id: query.after.id,
      });
    }
    const rows = await builder
      .orderBy('a.title', 'ASC')
      .addOrderBy('a.id', 'ASC')
      .limit(query.limit)
      .getMany();
    return rows.map((row) => ArticleMapper.toDomain(row));
  }

  async findPublishedBySlug(
    cropType: string,
    slug: string,
  ): Promise<Article | null> {
    const row = await this.repository.findOneBy({
      cropType,
      slug,
      isPublished: true,
    });
    return row ? ArticleMapper.toDomain(row) : null;
  }

  async findPublishedByDiseaseCodes(
    diseaseCodes: string[],
  ): Promise<Article[]> {
    if (diseaseCodes.length === 0) return [];
    const rows = await this.repository.findBy({
      diseaseCode: In(diseaseCodes),
      isPublished: true,
    });
    return rows.map((row) => ArticleMapper.toDomain(row));
  }

  async listIndexable(): Promise<Article[]> {
    const rows = await this.repository.findBy({
      status: EArticleStatus.REVIEWED,
      isPublished: true,
    });
    return rows.map((row) => ArticleMapper.toDomain(row));
  }
}
