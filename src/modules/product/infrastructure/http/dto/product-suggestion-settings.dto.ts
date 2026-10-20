import { IsInt } from 'class-validator';

export class UpdateProductSuggestionSettingsDto {
  /** Suggestions each distributor sees as its quota (lifetime), 1..10000. */
  @IsInt()
  invalidImageLimit: number;

  /** Hidden bonus used by NOT_FOUND suggestions first, 0..10000. */
  @IsInt()
  notFoundLimit: number;
}
