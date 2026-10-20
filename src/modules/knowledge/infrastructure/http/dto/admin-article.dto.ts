import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class AdminArticleCropParamsDto {
  /** Crop slug, e.g. `lua`. */
  @Matches('^[a-z0-9]+(-[a-z0-9]+)*$')
  @Length(1, 100)
  cropSlug: string;
}

export class AdminArticleCodeParamsDto {
  /** Disease code (main article) or variant code, e.g. `RICE_BLAST__V1`. */
  @Matches('^[A-Z0-9_]{1,100}$')
  code: string;
}

export class ArticleImageCreditDto {
  @IsString()
  @Length(1, 200)
  source: string;

  @IsString()
  @Length(1, 200)
  author: string;

  /** e.g. `CC BY 4.0`. */
  @IsString()
  @Length(1, 100)
  license: string;

  @IsUrl()
  url: string;
}

export class AdminArticleImageDto {
  /** Name used in the markdown and `cover`, e.g. `dao-on-la-1.webp` (stored as webp whatever the upload). */
  @Matches('^[a-z0-9-]+\\.webp$')
  @MaxLength(100)
  file: string;

  /** Key from POST /media/presign-url (jpg, png or webp) for a new image; omit to keep the stored image of `file` (edit only). */
  @IsOptional()
  @Matches('^tmp/')
  @MaxLength(300)
  tmpKey?: string;

  @IsString()
  @Length(1, 300)
  alt: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string | null;

  @ValidateNested()
  @Type(() => ArticleImageCreditDto)
  credit: ArticleImageCreditDto;
}

export class ArticleSourceDto {
  @IsString()
  @Length(1, 300)
  title: string;

  @IsUrl()
  url: string;
}

/** Page content an admin writes; length rules of title / summary / body are checked by the domain. */
export class UpdateArticleDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(300)
  summary: string;

  /** Markdown body: images by file name (`![alt](dao-on-1.webp)`), links as `/diseases/<CODE>`. */
  @IsString()
  @Length(1, 100000)
  markdown: string;

  /** One of `images[].file`. */
  @Matches('^[a-z0-9-]+\\.webp$')
  cover: string;

  /** Full list: images left out are dropped. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => AdminArticleImageDto)
  images: AdminArticleImageDto[];

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ArticleSourceDto)
  sources: ArticleSourceDto[];
}

export class CreateArticleDto extends UpdateArticleDto {
  /** Disease code (main article) or variant code (its disease needs a main article). */
  @Matches('^[A-Z0-9_]{1,100}$')
  code: string;

  /** Fixed once created; unique within the crop. */
  @Matches('^[a-z0-9]+(-[a-z0-9]+)*$')
  @Length(1, 100)
  slug: string;
}
