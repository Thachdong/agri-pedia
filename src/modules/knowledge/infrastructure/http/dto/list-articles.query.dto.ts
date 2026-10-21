import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { EDiseaseCategory } from '../../../domain';

export const DEFAULT_ARTICLE_PAGE_SIZE = 50;
export const MAX_ARTICLE_PAGE_SIZE = 100;
export const MAX_ARTICLE_DISEASE_CODES = 50;

/**
 * Every item matches the disease code pattern. Wrapped so the Swagger plugin does not see `@Matches`:
 * it would put the pattern on the array itself and Swagger UI would reject two codes or more.
 */
const EachDiseaseCode = () =>
  Matches('^[A-Z0-9_]{1,100}$', undefined, { each: true });

/** `?diseaseCodes=A&diseaseCodes=B` and `?diseaseCodes=A,B` both give `['A', 'B']`. */
const toCodeList = ({ value }: { value: unknown }): unknown =>
  (Array.isArray(value) ? value : [value])
    .flatMap((item) => (typeof item === 'string' ? item.split(',') : [item]))
    .map((item) => (typeof item === 'string' ? item.trim() : item))
    .filter((item) => item !== '');

export class ListArticlesQueryDto {
  /** Crop slug from GET /knowledge/articles/crops, e.g. `lua`. */
  @Matches('^[a-z0-9]+(-[a-z0-9]+)*$')
  @Length(1, 100)
  crop: string;

  /** Category of the article's disease. */
  @IsOptional()
  @IsEnum(EDiseaseCategory)
  category?: EDiseaseCategory;

  /** Disease codes (e.g. `RICE_BLAST`): articles about any of them. Repeat the parameter or separate by commas; 1..50. */
  @IsOptional()
  @Transform(toCodeList)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_ARTICLE_DISEASE_CODES)
  @EachDiseaseCode()
  diseaseCodes?: string[];

  /** `nextCursor` from the previous page; omit for the first page. */
  @IsOptional()
  @IsString()
  @Length(1, 512)
  cursor?: string;

  /** Page size, 1..100 (default 50). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_ARTICLE_PAGE_SIZE)
  limit?: number;
}
