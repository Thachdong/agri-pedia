import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { EDiseaseCategory } from '../../../domain';

export class ListDiseasesQueryDto {
  /** Crop code from GET /knowledge/crops, e.g. `RICE`. */
  @Matches('^[A-Z0-9_]{1,50}$')
  crop: string;

  @IsOptional()
  @IsEnum(EDiseaseCategory)
  category?: EDiseaseCategory;

  /** Searches Vietnamese/English names and aliases, ignoring case and diacritics. */
  @IsOptional()
  @IsString()
  @Length(1, 100)
  q?: string;
}
