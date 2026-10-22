import { DiagnosisInvalidSettingsException } from '../exceptions/diagnosis-invalid-settings.exception';

export type TDiagnosisSettingsProps = {
  /** Diagnoses per user per day. */
  dailyFreeLimit: number;
  /** Crop preselected in the diagnosis form; null = none. */
  defaultCropType: string | null;
  /** Images per diagnosis (at least 1). */
  maxImages: number;
  /** Size of each image as sent. */
  maxImageBytes: number;
  /** Pixel size of each image as sent. */
  maxImageWidth: number;
  maxImageHeight: number;
};

/** AI models picked by an admin; null = the model set in the env (`diagnosis` config). */
export type TDiagnosisAiModels = {
  /** Model for B1 (describe). */
  describeModel: string | null;
  /** Model for B3 (verify). */
  verifyModel: string | null;
};

/** Allowed range of each numeric setting. */
export const DIAGNOSIS_SETTINGS_BOUNDS = {
  dailyFreeLimit: { min: 1, max: 1000 },
  maxImages: { min: 1, max: 10 },
  maxImageBytes: { min: 100 * 1024, max: 20 * 1024 * 1024 },
  maxImageWidth: { min: 256, max: 8192 },
  maxImageHeight: { min: 256, max: 8192 },
} as const;

export const DEFAULT_DIAGNOSIS_SETTINGS: TDiagnosisSettingsProps = {
  dailyFreeLimit: 3,
  defaultCropType: null,
  maxImages: 5,
  maxImageBytes: 5 * 1024 * 1024,
  maxImageWidth: 4096,
  maxImageHeight: 4096,
};

export const DEFAULT_DIAGNOSIS_AI_MODELS: TDiagnosisAiModels = {
  describeModel: null,
  verifyModel: null,
};

const CROP_CODE = /^[A-Z0-9_]{1,50}$/;
const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

function validate(props: TDiagnosisSettingsProps): TDiagnosisSettingsProps {
  for (const [field, { min, max }] of Object.entries(
    DIAGNOSIS_SETTINGS_BOUNDS,
  )) {
    const value = props[field as keyof typeof DIAGNOSIS_SETTINGS_BOUNDS];
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new DiagnosisInvalidSettingsException(
        field,
        `must be an integer in ${min}..${max}, got ${value}`,
      );
    }
  }
  if (
    props.defaultCropType !== null &&
    !CROP_CODE.test(props.defaultCropType)
  ) {
    throw new DiagnosisInvalidSettingsException(
      'defaultCropType',
      `not a crop code: ${props.defaultCropType}`,
    );
  }
  return { ...props };
}

function validateAiModels(models: TDiagnosisAiModels): TDiagnosisAiModels {
  for (const [field, value] of Object.entries(models)) {
    if (value !== null && !MODEL_ID.test(value)) {
      throw new DiagnosisInvalidSettingsException(
        field,
        `not a model id: ${value}`,
      );
    }
  }
  return { ...models };
}

/** App-wide settings of the diagnosis feature (one per app). */
export class DiagnosisSettings {
  private constructor(
    private props: TDiagnosisSettingsProps,
    private aiModels: TDiagnosisAiModels,
  ) {}

  /** Settings used until an admin saves some. */
  static defaults(): DiagnosisSettings {
    return new DiagnosisSettings(
      { ...DEFAULT_DIAGNOSIS_SETTINGS },
      { ...DEFAULT_DIAGNOSIS_AI_MODELS },
    );
  }

  static restore(
    props: TDiagnosisSettingsProps,
    aiModels: TDiagnosisAiModels = DEFAULT_DIAGNOSIS_AI_MODELS,
  ): DiagnosisSettings {
    return new DiagnosisSettings({ ...props }, { ...aiModels });
  }

  /** Replaces every setting but the AI models; throws DiagnosisInvalidSettings when one is out of range. */
  update(props: TDiagnosisSettingsProps): void {
    this.props = validate(props);
  }

  /** Replaces both AI models (null = env model); throws DiagnosisInvalidSettings on a malformed model id. */
  updateAiModels(models: TDiagnosisAiModels): void {
    this.aiModels = validateAiModels(models);
  }

  get dailyFreeLimit(): number {
    return this.props.dailyFreeLimit;
  }

  get defaultCropType(): string | null {
    return this.props.defaultCropType;
  }

  get maxImages(): number {
    return this.props.maxImages;
  }

  get maxImageBytes(): number {
    return this.props.maxImageBytes;
  }

  get maxImageWidth(): number {
    return this.props.maxImageWidth;
  }

  get maxImageHeight(): number {
    return this.props.maxImageHeight;
  }

  get describeModel(): string | null {
    return this.aiModels.describeModel;
  }

  get verifyModel(): string | null {
    return this.aiModels.verifyModel;
  }
}
