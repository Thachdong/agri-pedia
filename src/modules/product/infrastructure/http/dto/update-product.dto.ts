import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsString,
  IsUUID,
  Length,
  Max,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { EProductStatus, EProductUnit } from '../../../domain';
import { MAX_MEDIA_PER_PRODUCT, MAX_PRICE } from './create-product.dto';
import { ProductMediaDto } from './product-media.dto';

/** Field may be omitted, but `null` is rejected (unlike `@IsOptional`). */
const IsOmittable = () => ValidateIf((_, value) => value !== undefined);

/** Every field is optional; omitted fields keep their current value. */
export class UpdateProductDto {
  @IsOmittable()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOmittable()
  @IsString()
  @Length(1, 5000)
  description?: string;

  /** >= 0 (checked by the domain), at most 2 decimals. */
  @IsOmittable()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Max(MAX_PRICE)
  price?: number;

  /** Integer >= 0 (checked by the domain). */
  @IsOmittable()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Max(2_147_483_647)
  quantity?: number;

  @IsOmittable()
  @IsEnum(EProductUnit)
  unit?: EProductUnit;

  /** Id from `GET /categories`. */
  @IsOmittable()
  @IsUUID()
  categoryId?: string;

  @IsOmittable()
  @IsEnum(EProductStatus)
  status?: EProductStatus;

  /** 0..10 new files already uploaded to TMP. */
  @IsOmittable()
  @IsArray()
  @ArrayMaxSize(MAX_MEDIA_PER_PRODUCT)
  @ValidateNested({ each: true })
  @Type(() => ProductMediaDto)
  addMedia?: ProductMediaDto[];

  /** 0..10 media ids of this product to delete; ids of other products are ignored. */
  @IsOmittable()
  @IsArray()
  @ArrayMaxSize(MAX_MEDIA_PER_PRODUCT)
  @IsUUID(undefined, { each: true })
  removeMediaIds?: string[];
}
