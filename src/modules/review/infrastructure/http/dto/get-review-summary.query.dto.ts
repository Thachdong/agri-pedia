import { IsEnum, IsUUID } from 'class-validator';
import { EReviewTargetType } from '../../../domain';

export class GetReviewSummaryQueryDto {
  /** PRODUCT: a product; USER: a distributor (its own reviews, not its products'). */
  @IsEnum(EReviewTargetType)
  targetType: EReviewTargetType;

  /** Product id or distributor id, per `targetType`. */
  @IsUUID()
  targetId: string;
}
