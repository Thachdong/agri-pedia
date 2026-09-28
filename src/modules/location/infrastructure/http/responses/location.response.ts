export class LocationItemResponse {
  /** Stable key to send back (unique among provinces; among wards of one province). */
  codename: string;
  name: string;
}

export class ListProvincesResponse {
  /** Master data order. */
  provinces: LocationItemResponse[];
}

export class ListWardsResponse {
  /** Master data order. */
  wards: LocationItemResponse[];
}
