import { IsInt, IsString, ValidateIf } from 'class-validator';

/** Field may be omitted, but `null` is rejected (unlike `@IsOptional`). */
const IsOmittable = () => ValidateIf((_, value) => value !== undefined);

/** Every field is optional; omitted fields keep their current value. */
export class UpdateReviewDto {
  /** 1..1000 characters after trimming (checked by the domain). */
  @IsOmittable()
  @IsString()
  content?: string;

  /** Integer 1..5 (range checked by the domain). */
  @IsOmittable()
  @IsInt()
  star?: number;
}
