import { Matches } from 'class-validator';

export class DiseaseParamsDto {
  /** Disease code, e.g. `RICE_BLAST`. */
  @Matches('^[A-Z0-9_]{1,100}$')
  code: string;
}
