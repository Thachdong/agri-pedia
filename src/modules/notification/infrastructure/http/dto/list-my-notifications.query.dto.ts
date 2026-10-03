import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export const DEFAULT_NOTIFICATION_PAGE_SIZE = 20;
export const MAX_NOTIFICATION_PAGE_SIZE = 50;

export class ListMyNotificationsQueryDto {
  /** `nextCursor` from the previous page; omit for the first page. */
  @IsOptional()
  @IsString()
  @Length(1, 512)
  cursor?: string;

  /** Page size, 1..50 (default 20). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_NOTIFICATION_PAGE_SIZE)
  limit?: number;
}
