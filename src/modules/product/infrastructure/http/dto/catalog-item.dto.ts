import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  CATALOG_ITEM_DESCRIPTION_MAX_LENGTH,
  CATALOG_ITEM_NAME_MAX_LENGTH,
  EProductUnit,
} from '../../../domain';

/** Skips validation when the field is omitted or null (null clears it). */
const IsClearable = () =>
  ValidateIf((_, value) => value !== undefined && value !== null);

export const DEFAULT_ADMIN_PAGE_SIZE = 20;
export const MAX_ADMIN_PAGE_SIZE = 100;

export class CreateCatalogItemDto {
  /** Trade name, unique ignoring case, diacritics and punctuation. */
  @IsString()
  @Length(1, CATALOG_ITEM_NAME_MAX_LENGTH)
  name: string;

  /** Suggested as the product description (active ingredients, uses, dosage...). */
  @IsString()
  @Length(1, CATALOG_ITEM_DESCRIPTION_MAX_LENGTH)
  description: string;

  /** Suggested category: id from `GET /categories`. */
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /** Suggested unit. */
  @IsOptional()
  @IsEnum(EProductUnit)
  unit?: EProductUnit;
}

/** Omitted fields are kept; null clears categoryId / unit. */
export class UpdateCatalogItemDto {
  @IsOptional()
  @IsString()
  @Length(1, CATALOG_ITEM_NAME_MAX_LENGTH)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, CATALOG_ITEM_DESCRIPTION_MAX_LENGTH)
  description?: string;

  /** Id from `GET /categories`, or null to clear. */
  @IsClearable()
  @IsUUID()
  categoryId?: string | null;

  /** null clears. */
  @IsClearable()
  @IsEnum(EProductUnit)
  unit?: EProductUnit | null;
}

export class AdminPageQueryDto {
  /** 1-based page (default 1). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /** Page size, 1..100 (default 20). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_ADMIN_PAGE_SIZE)
  limit?: number;
}

export class ListCatalogItemsQueryDto extends AdminPageQueryDto {
  /** Part of the name, ignoring case, diacritics and punctuation. */
  @IsOptional()
  @IsString()
  @Length(1, CATALOG_ITEM_NAME_MAX_LENGTH)
  search?: string;
}
