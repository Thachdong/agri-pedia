import { Matches } from 'class-validator';

export class ProvinceParamsDto {
  /** Province codename from GET /provinces, e.g. `ha_noi`. */
  @Matches(/^[a-z0-9_]{1,64}$/)
  provinceCode: string;
}
