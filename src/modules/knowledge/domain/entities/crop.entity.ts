import { ECropStage } from '../enums/crop-stage.enum';
import { EPlantPart } from '../enums/plant-part.enum';
import { TObservationFeatures } from '../observation-features';

/** Plant part a crop can be photographed on (part dropdown + vision `detectedPart`). */
export type TCropPlantPart = {
  code: EPlantPart;
  nameVi: string;
  /** Name in the vision prompt. */
  promptEn: string;
};

export type TCropStageLabel = { code: ECropStage; nameVi: string };

/** Crop-specific parts of the vision prompts. */
export type TCropPrompt = {
  /** e.g. `durian trees (Durio zibethinus)`. */
  subjectEn: string;
  /** Whole-plant symptoms worth reporting at image level. */
  wholeImageCuesEn: string;
};

export type TCropProps = {
  /** Stable key, e.g. `RICE`. */
  code: string;
  nameVi: string;
  nameEn: string;
  /** Supported by diagnosis. */
  enabled: boolean;
  /** KB version of the crop's diseases and profile, e.g. `2026-10-12`. */
  kbVersion: string;
  /** Order in crop lists. */
  sortOrder: number;
  plantParts: TCropPlantPart[];
  cropStages: TCropStageLabel[];
  /** Observation enums the vision step fills in and the crop's profiles weight. */
  features: TObservationFeatures;
  prompt: TCropPrompt;
};

/** Crop (master data, read-only) with its diagnosis configuration. */
export class Crop {
  private constructor(private readonly props: TCropProps) {}

  static restore(props: TCropProps): Crop {
    return new Crop({ ...props });
  }

  /** Same crop, enabled for diagnosis. */
  enable(): Crop {
    return new Crop({ ...this.props, enabled: true });
  }

  get code(): string {
    return this.props.code;
  }

  get nameVi(): string {
    return this.props.nameVi;
  }

  get nameEn(): string {
    return this.props.nameEn;
  }

  get enabled(): boolean {
    return this.props.enabled;
  }

  get kbVersion(): string {
    return this.props.kbVersion;
  }

  get sortOrder(): number {
    return this.props.sortOrder;
  }

  get plantParts(): TCropPlantPart[] {
    return this.props.plantParts;
  }

  get cropStages(): TCropStageLabel[] {
    return this.props.cropStages;
  }

  get features(): TObservationFeatures {
    return this.props.features;
  }

  get prompt(): TCropPrompt {
    return this.props.prompt;
  }
}
