import { IsInt, IsString, Matches, ValidateIf } from 'class-validator';

/** Every diagnosis setting (full replace); ranges are checked by the domain. */
export class UpdateDiagnosisSettingsDto {
  /** Diagnoses per user per day, 1..1000. */
  @IsInt()
  dailyFreeLimit: number;

  /** Crop code enabled for diagnosis (GET /knowledge/crops), or null for none. */
  @ValidateIf((dto: UpdateDiagnosisSettingsDto) => dto.defaultCropType !== null)
  @IsString()
  @Matches('^[A-Z0-9_]{1,50}$')
  defaultCropType: string | null;

  /** Images per diagnosis, 1..10. */
  @IsInt()
  maxImages: number;

  /** Bytes per image as sent, 102400..20971520. */
  @IsInt()
  maxImageBytes: number;

  /** Pixel width per image as sent (EXIF orientation applied), 256..8192. */
  @IsInt()
  maxImageWidth: number;

  /** Pixel height per image as sent (EXIF orientation applied), 256..8192. */
  @IsInt()
  maxImageHeight: number;
}
