export interface ILocationQueryPort {
  /** Province codename. */
  provinceExists(provinceCode: string): Promise<boolean>;
  /** Both are codenames; false when either is unknown or the ward is in another province. */
  wardBelongsToProvince(
    provinceCode: string,
    wardCode: string,
  ): Promise<boolean>;
}
