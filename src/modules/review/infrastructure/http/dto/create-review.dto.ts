import { IsEnum, IsInt, IsString, IsUUID } from 'class-validator';
import { EReviewTargetType } from '../../../domain';

export class CreateReviewDto {
  @IsEnum(EReviewTargetType)
  targetType: EReviewTargetType;

  /** Product id (PRODUCT) or distributor user id (USER). */
  @IsUUID()
  targetId: string;

  /** 1..1000 characters after trimming (checked by the domain). */
  @IsString()
  content: string;

  /** Integer 1..5 (range checked by the domain). */
  @IsInt()
  star: number;
}
