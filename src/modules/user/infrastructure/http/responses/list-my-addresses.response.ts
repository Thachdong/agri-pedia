export class MyAddressResponse {
  id: string;
  /** Province codename. */
  province: string;
  /** Ward codename. */
  ward: string;
  houseNumber: string;
  lat: number;
  long: number;
  isPrimary: boolean;
}

export class ListMyAddressesResponse {
  /** Primary first, then by id. */
  addresses: MyAddressResponse[];
}
