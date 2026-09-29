import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  Matches,
  Max,
  Min,
  registerDecorator,
  ValidateIf,
  ValidationArguments,
} from 'class-validator';

export const DEFAULT_NEARBY_PAGE_SIZE = 20;
export const MAX_NEARBY_PAGE_SIZE = 50;

const CODENAME = '^[a-z0-9_]{1,64}$';

/** Fails when any of `others` is also present: a point and an area cannot be combined. */
const IsNotCombinedWith =
  (...others: (keyof FindNearbyDistributorsQueryDto)[]): PropertyDecorator =>
  (target, propertyName) =>
    registerDecorator({
      name: 'isNotCombinedWith',
      target: target.constructor,
      propertyName: propertyName as string,
      validator: {
        validate(_value: unknown, args: ValidationArguments): boolean {
          const dto = args.object as FindNearbyDistributorsQueryDto;
          return others.every((other) => dto[other] === undefined);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} cannot be combined with ${others.join('/')}`;
        },
      },
    });

const hasPoint = (dto: FindNearbyDistributorsQueryDto) =>
  dto.lat !== undefined || dto.long !== undefined;
const hasArea = (dto: FindNearbyDistributorsQueryDto) =>
  dto.provinceCode !== undefined || dto.wardCode !== undefined;

/** Either a point (`lat` + `long`), an area (`provinceCode` [+ `wardCode`]), or neither. */
export class FindNearbyDistributorsQueryDto {
  /** Required with `long`. Range is checked by the domain (Coordinates). */
  @ValidateIf(hasPoint)
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsNotCombinedWith('provinceCode', 'wardCode')
  lat?: number;

  /** Required with `lat`. */
  @ValidateIf(hasPoint)
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsNotCombinedWith('provinceCode', 'wardCode')
  long?: number;

  /** Province codename from GET /provinces; required with `wardCode`. */
  @ValidateIf(hasArea)
  @Matches(CODENAME)
  provinceCode?: string;

  /** Ward codename of `provinceCode`; listed first. */
  @IsOptional()
  @Matches(CODENAME)
  wardCode?: string;

  /** 1-based (default 1). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /** Page size, 1..50 (default 20). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_NEARBY_PAGE_SIZE)
  limit?: number;
}
