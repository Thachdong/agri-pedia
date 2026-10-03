import { Address, Coordinates, User } from '../../domain';

export type TDistributorSearchPage = { offset: number; limit: number };

export type TDistributorSearchHit = {
  distributor: User;
  /** Primary address (the shop). */
  address: Address;
  /** Set by the distance searches only. */
  distanceMeters: number | null;
};

export type TDistributorSearchResult = {
  items: TDistributorSearchHit[];
  /** Matches over every page. */
  total: number;
};

/** Every search covers ACTIVE distributors with a primary address only. */
export interface IDistributorSearchRepository {
  /** Within `radiusMeters` of `point`, nearest first. */
  searchWithinRadius(
    point: Coordinates,
    radiusMeters: number,
    page: TDistributorSearchPage,
  ): Promise<TDistributorSearchResult>;
  /** All of them, nearest to `point` first. */
  searchNearest(
    point: Coordinates,
    page: TDistributorSearchPage,
  ): Promise<TDistributorSearchResult>;
  /** In the province; `wardCode` given: that ward first. Then by username, id. */
  searchInProvince(
    provinceCode: string,
    wardCode: string | null,
    page: TDistributorSearchPage,
  ): Promise<TDistributorSearchResult>;
  /** All of them, by username, id. */
  searchNationwide(
    page: TDistributorSearchPage,
  ): Promise<TDistributorSearchResult>;
}

export const DISTRIBUTOR_SEARCH_REPOSITORY = Symbol(
  'DISTRIBUTOR_SEARCH_REPOSITORY',
);
