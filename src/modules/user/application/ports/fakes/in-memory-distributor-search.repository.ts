import { Address, Coordinates, EUserRole, User } from '../../../domain';
import {
  IDistributorSearchRepository,
  TDistributorSearchHit,
  TDistributorSearchPage,
  TDistributorSearchResult,
} from '../distributor-search.repository';
import { InMemoryAddressRepository } from './in-memory-address.repository';
import { InMemoryUserRepository } from './in-memory-user.repository';

const EARTH_RADIUS_METERS = 6_371_008.8;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Haversine distance; PostGIS geography differs by well under 1%. */
const distanceMeters = (from: Coordinates, to: Coordinates): number => {
  const dLat = toRadians(to.lat - from.lat);
  const dLong = toRadians(to.long - from.long);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLong / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
};

const byName = (a: TDistributorSearchHit, b: TDistributorSearchHit) =>
  a.distributor.username.localeCompare(b.distributor.username) ||
  a.distributor.id.localeCompare(b.distributor.id);

/** Reads the users and addresses stored in the given fakes. */
export class InMemoryDistributorSearchRepository implements IDistributorSearchRepository {
  constructor(
    private readonly users: InMemoryUserRepository,
    private readonly addresses: InMemoryAddressRepository,
  ) {}

  async searchWithinRadius(
    point: Coordinates,
    radiusMeters: number,
    page: TDistributorSearchPage,
  ): Promise<TDistributorSearchResult> {
    const hits = this.withDistance(point).filter(
      (hit) => (hit.distanceMeters ?? Infinity) <= radiusMeters,
    );
    return this.paginate(hits, page);
  }

  async searchNearest(
    point: Coordinates,
    page: TDistributorSearchPage,
  ): Promise<TDistributorSearchResult> {
    return this.paginate(this.withDistance(point), page);
  }

  async searchInProvince(
    provinceCode: string,
    wardCode: string | null,
    page: TDistributorSearchPage,
  ): Promise<TDistributorSearchResult> {
    const inWard = (hit: TDistributorSearchHit) =>
      wardCode !== null && hit.address.ward === wardCode ? 0 : 1;
    const hits = this.hits()
      .filter((hit) => hit.address.province === provinceCode)
      .sort((a, b) => inWard(a) - inWard(b) || byName(a, b));
    return this.paginate(hits, page);
  }

  async searchNationwide(
    page: TDistributorSearchPage,
  ): Promise<TDistributorSearchResult> {
    return this.paginate(this.hits().sort(byName), page);
  }

  private hits(): TDistributorSearchHit[] {
    const primaryByUser = new Map<string, Address>();
    for (const address of this.addresses.items.values()) {
      if (address.isPrimary) {
        primaryByUser.set(address.userId, address);
      }
    }
    return [...this.users.items.values()]
      .filter(
        (user: User) => user.role === EUserRole.DISTRIBUTOR && user.canLogin(),
      )
      .flatMap((distributor) => {
        const address = primaryByUser.get(distributor.id);
        return address ? [{ distributor, address, distanceMeters: null }] : [];
      });
  }

  private withDistance(point: Coordinates): TDistributorSearchHit[] {
    return this.hits()
      .map((hit) => ({
        ...hit,
        distanceMeters: distanceMeters(point, hit.address.coordinates),
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  private paginate(
    hits: TDistributorSearchHit[],
    page: TDistributorSearchPage,
  ): TDistributorSearchResult {
    return {
      items: hits.slice(page.offset, page.offset + page.limit),
      total: hits.length,
    };
  }
}
