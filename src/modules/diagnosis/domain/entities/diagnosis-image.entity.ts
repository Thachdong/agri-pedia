import { randomUUID } from 'node:crypto';
import { TDiagnosisRegion, TImageDisease } from '../diagnosis-result.types';
import { EDiagnosisImageStatus } from '../enums/diagnosis-image-status.enum';
import { EPlantPart } from '../enums/plant-part.enum';

export type TDiagnosisImageProps = {
  /** Order the client sent the file in, from 0. */
  sortOrder: number;
  /** Part chosen by the user (a hint for the AI). */
  plantPart: EPlantPart;
  /** Stored media; null until the image is uploaded, or when the upload failed. */
  mediaId: string | null;
  /** Part recognized by the AI; null while processing or when unsure. */
  detectedPart: EPlantPart | null;
  /** null while processing. */
  status: EDiagnosisImageStatus | null;
  diseases: TImageDisease[];
  regions: TDiagnosisRegion[];
  /** Verbatim AI answers, for debugging. */
  b1Raw: unknown;
  b3Raw: unknown;
};

/** Result of the pipeline for one image. */
export type TDiagnosisImageResult = {
  detectedPart: EPlantPart | null;
  status: EDiagnosisImageStatus;
  diseases: TImageDisease[];
  regions: TDiagnosisRegion[];
  b1Raw: unknown;
  b3Raw: unknown;
};

/** One image of a diagnosis (child entity of Diagnosis). */
export class DiagnosisImage {
  private constructor(
    readonly id: string,
    private props: TDiagnosisImageProps,
  ) {}

  static create(sortOrder: number, plantPart: EPlantPart): DiagnosisImage {
    return new DiagnosisImage(randomUUID(), {
      sortOrder,
      plantPart,
      mediaId: null,
      detectedPart: null,
      status: null,
      diseases: [],
      regions: [],
      b1Raw: null,
      b3Raw: null,
    });
  }

  static restore(id: string, props: TDiagnosisImageProps): DiagnosisImage {
    return new DiagnosisImage(id, { ...props });
  }

  get sortOrder(): number {
    return this.props.sortOrder;
  }

  get plantPart(): EPlantPart {
    return this.props.plantPart;
  }

  get mediaId(): string | null {
    return this.props.mediaId;
  }

  get detectedPart(): EPlantPart | null {
    return this.props.detectedPart;
  }

  get status(): EDiagnosisImageStatus | null {
    return this.props.status;
  }

  get diseases(): TImageDisease[] {
    return this.props.diseases;
  }

  get regions(): TDiagnosisRegion[] {
    return this.props.regions;
  }

  get b1Raw(): unknown {
    return this.props.b1Raw;
  }

  get b3Raw(): unknown {
    return this.props.b3Raw;
  }

  /** Called by Diagnosis only. */
  recordResult(result: TDiagnosisImageResult): void {
    this.props = { ...this.props, ...result };
  }

  /** Called by Diagnosis only. */
  attachMedia(mediaId: string): void {
    this.props.mediaId = mediaId;
  }
}
