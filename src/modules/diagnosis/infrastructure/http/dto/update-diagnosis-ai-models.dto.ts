import { IsString, ValidateIf } from 'class-validator';

/** Both AI models (full replace); null = env model. The model id format is checked by the domain. */
export class UpdateDiagnosisAiModelsDto {
  /** Model for B1 (describe), e.g. `gemini-3-flash-preview`. */
  @ValidateIf((dto: UpdateDiagnosisAiModelsDto) => dto.describeModel !== null)
  @IsString()
  describeModel: string | null;

  /** Model for B3 (verify). */
  @ValidateIf((dto: UpdateDiagnosisAiModelsDto) => dto.verifyModel !== null)
  @IsString()
  verifyModel: string | null;
}
