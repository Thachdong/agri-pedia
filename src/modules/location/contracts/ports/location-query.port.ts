export interface ILocationQueryPort {
  /** Both are codenames; false when either is unknown or the ward is in another province. */
  wardBelongsToProvince(
    provinceCode: string,
    wardCode: string,
  ): Promise<boolean>;
}
