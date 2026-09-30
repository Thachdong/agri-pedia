import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import {
  ILocationQueryPort,
  LOCATION_QUERY_PORT,
} from '@modules/location/contracts';
import {
  Coordinates,
  EBusinessType,
  InvalidLocationException,
} from '../../domain';
import {
  ADDRESS_REPOSITORY,
  IAddressRepository,
} from '../ports/address.repository';
import {
  DISTRIBUTOR_SEARCH_REPOSITORY,
  IDistributorSearchRepository,
  TDistributorSearchPage,
  TDistributorSearchResult,
} from '../ports/distributor-search.repository';

export type TFindNearbyDistributorsInput = {
  /** Caller, from the access token; null for a guest. */
  userId: string | null;
  /** Omitted: the caller's primary address is used (a guest gets every distributor). */
  location?:
    | { kind: 'point'; lat: number; long: number }
    | { kind: 'area'; provinceCode: string; wardCode?: string };
  /** 1-based. */
  page: number;
  limit: number;
};

/** Where the searched location came from. */
export enum EDistributorSearchSource {
  QUERY_POINT = 'query_point',
  QUERY_AREA = 'query_area',
  ADDRESS = 'address',
  NONE = 'none',
}

/** Stage that produced the result. */
export enum EDistributorSearchScope {
  RADIUS = 'radius',
  NATIONWIDE_BY_DISTANCE = 'nationwide_by_distance',
  PROVINCE = 'province',
  NATIONWIDE = 'nationwide',
}

export type TNearbyDistributor = {
  userId: string;
  username: string;
  /** Media id. */
  avatar: string | null;
  businessType: EBusinessType | null;
  address: {
    province: string;
    ward: string;
    houseNumber: string;
    lat: number;
    long: number;
  };
  /** Null for the area scopes. */
  distanceMeters: number | null;
};

export type TFindNearbyDistributorsOutput = {
  scope: EDistributorSearchScope;
  source: EDistributorSearchSource;
  items: TNearbyDistributor[];
  total: number;
};

type TStage = {
  scope: EDistributorSearchScope;
  run: () => Promise<TDistributorSearchResult>;
};

/**
 * Lists ACTIVE distributors for anyone, guests included. Location: point / area from the request,
 * else the caller's primary address (none for a guest). Stages run in order and the first one with any
 * match is paginated: point → radius, nationwide by distance; area → province, nationwide.
 */
@Injectable()
export class FindNearbyDistributorsUseCase {
  constructor(
    @Inject(ADDRESS_REPOSITORY) private readonly addresses: IAddressRepository,
    @Inject(DISTRIBUTOR_SEARCH_REPOSITORY)
    private readonly distributors: IDistributorSearchRepository,
    @Inject(LOCATION_QUERY_PORT)
    private readonly locationQuery: ILocationQueryPort,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
  ) {}

  async execute(
    input: TFindNearbyDistributorsInput,
  ): Promise<TFindNearbyDistributorsOutput> {
    const page: TDistributorSearchPage = {
      offset: (input.page - 1) * input.limit,
      limit: input.limit,
    };
    const { source, stages } = await this.plan(input, page);

    let result: TDistributorSearchResult = { items: [], total: 0 };
    let scope = stages[stages.length - 1].scope;
    for (const stage of stages) {
      result = await stage.run();
      scope = stage.scope;
      if (result.total > 0) {
        break;
      }
    }

    return {
      scope,
      source,
      total: result.total,
      items: result.items.map(({ distributor, address, distanceMeters }) => ({
        userId: distributor.id,
        username: distributor.username,
        avatar: distributor.avatar,
        businessType: distributor.businessType,
        address: {
          province: address.province,
          ward: address.ward,
          houseNumber: address.houseNumber,
          lat: address.coordinates.lat,
          long: address.coordinates.long,
        },
        distanceMeters,
      })),
    };
  }

  private async plan(
    input: TFindNearbyDistributorsInput,
    page: TDistributorSearchPage,
  ): Promise<{ source: EDistributorSearchSource; stages: TStage[] }> {
    const location = input.location;
    if (location?.kind === 'point') {
      return {
        source: EDistributorSearchSource.QUERY_POINT,
        stages: this.pointStages(
          Coordinates.create(location.lat, location.long),
          page,
        ),
      };
    }
    if (location?.kind === 'area') {
      const provinceCode = location.provinceCode.trim();
      const wardCode = location.wardCode?.trim() || null;
      const known =
        wardCode === null
          ? await this.locationQuery.provinceExists(provinceCode)
          : await this.locationQuery.wardBelongsToProvince(
              provinceCode,
              wardCode,
            );
      if (!known) {
        throw new InvalidLocationException(provinceCode, wardCode);
      }
      return {
        source: EDistributorSearchSource.QUERY_AREA,
        stages: [
          {
            scope: EDistributorSearchScope.PROVINCE,
            run: () =>
              this.distributors.searchInProvince(provinceCode, wardCode, page),
          },
          this.nationwideStage(page),
        ],
      };
    }
    const address =
      input.userId === null
        ? null
        : await this.addresses.findPrimaryByUserId(input.userId);
    return address
      ? {
          source: EDistributorSearchSource.ADDRESS,
          stages: this.pointStages(address.coordinates, page),
        }
      : {
          source: EDistributorSearchSource.NONE,
          stages: [this.nationwideStage(page)],
        };
  }

  private pointStages(
    point: Coordinates,
    page: TDistributorSearchPage,
  ): TStage[] {
    const radiusMeters = this.config.get('distributorSearch').radiusKm * 1000;
    return [
      {
        scope: EDistributorSearchScope.RADIUS,
        run: () =>
          this.distributors.searchWithinRadius(point, radiusMeters, page),
      },
      {
        scope: EDistributorSearchScope.NATIONWIDE_BY_DISTANCE,
        run: () => this.distributors.searchNearest(point, page),
      },
    ];
  }

  private nationwideStage(page: TDistributorSearchPage): TStage {
    return {
      scope: EDistributorSearchScope.NATIONWIDE,
      run: () => this.distributors.searchNationwide(page),
    };
  }
}
