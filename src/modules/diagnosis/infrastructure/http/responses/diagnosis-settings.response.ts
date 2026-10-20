export class DiagnosisSettingsResponse {
  dailyFreeLimit: number;
  defaultCropType: string | null;
  maxImages: number;
  maxImageBytes: number;
  maxImageWidth: number;
  maxImageHeight: number;
}

export class DiagnosisFormSettingsResponse {
  /** Crop to preselect; null = none. */
  defaultCropType: string | null;
  minImages: number;
  maxImages: number;
  /** Per image as sent. */
  maxImageBytes: number;
  /** Per image as sent (EXIF orientation applied); resize larger photos before upload. */
  maxImageWidth: number;
  maxImageHeight: number;
  /** Diagnoses the caller may still send today (resets at 00:00 UTC+7); null without an access token. */
  remainingToday: number | null;
}
