import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { DIAGNOSIS_SETTINGS_BOUNDS, EPlantPart } from '../../../domain';

export class DiagnosisImageMetaDto {
  /** Plant part the photo shows (a hint for the AI). */
  @IsEnum(EPlantPart)
  plantPart: EPlantPart;
}

export class CreateDiagnosisMetaDto {
  /** Crop code from GET /knowledge/crops, e.g. `RICE`. */
  @Matches('^[A-Z0-9_]{1,50}$')
  cropType: string;

  /** One per uploaded file, same order (max images: GET /diagnoses/settings). */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(DIAGNOSIS_SETTINGS_BOUNDS.maxImages.max)
  @ValidateNested({ each: true })
  @Type(() => DiagnosisImageMetaDto)
  images: DiagnosisImageMetaDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

/** JSON text -> meta object; invalid JSON is left as text and fails `@IsObject`. */
function parseMeta({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  try {
    return plainToInstance(CreateDiagnosisMetaDto, JSON.parse(value));
  } catch {
    return value;
  }
}

/** Multipart text fields of POST /diagnoses (files come as `images`). */
export class CreateDiagnosisDto {
  /** JSON string: `{ cropType, images: [{ plantPart }], note? }`. */
  @Transform(parseMeta)
  @IsObject()
  @ValidateNested()
  meta: CreateDiagnosisMetaDto;
}
