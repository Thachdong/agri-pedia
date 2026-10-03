import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsString,
  IsUUID,
  Length,
  Max,
  ValidateNested,
} from 'class-validator';
import { EProductUnit } from '../../../domain';
import { ProductMediaDto } from './product-media.dto';

export const MAX_MEDIA_PER_PRODUCT = 10;
/** Largest value the `numeric(14,2)` price column holds. */
export const MAX_PRICE = 999_999_999_999.99;

export class CreateProductDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsString()
  @Length(1, 5000)
  description: string;

  /** >= 0 (checked by the domain), at most 2 decimals. */
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Max(MAX_PRICE)
  price: number;

  /** Id from `GET /categories`. */
  @IsUUID()
  categoryId: string;

  /** Integer >= 0 (checked by the domain). */
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Max(2_147_483_647)
  quantity: number;

  @IsEnum(EProductUnit)
  unit: EProductUnit;

  /** 1..10 files already uploaded to TMP. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_MEDIA_PER_PRODUCT)
  @ValidateNested({ each: true })
  @Type(() => ProductMediaDto)
  media: ProductMediaDto[];
}
