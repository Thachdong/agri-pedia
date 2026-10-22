import { IsInt, IsString, ValidateIf } from 'class-validator';

export class UpdateProductSuggestionSettingsDto {
  /** Suggestions each distributor sees as its quota (lifetime), 1..10000. */
  @IsInt()
  invalidImageLimit: number;

  /** Hidden bonus used by NOT_FOUND suggestions first, 0..10000. */
  @IsInt()
  notFoundLimit: number;
}

/** null = env model. The model id format is checked by the domain. */
export class UpdateProductSuggestionAiModelDto {
  /** Model that reads the product name, e.g. `gemini-3.5-flash-lite`. */
  @ValidateIf((dto: UpdateProductSuggestionAiModelDto) => dto.model !== null)
  @IsString()
  model: string | null;
}
