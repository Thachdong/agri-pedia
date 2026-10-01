import { Injectable } from '@nestjs/common';
import { DataSource, In, SelectQueryBuilder } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import {
  IDistributorSearchRepository,
  TDistributorSearchPage,
  TDistributorSearchResult,
} from '../../application/ports';
import { Coordinates, EUserRole, EUserStatus } from '../../domain';
import { AddressMapper } from './address.mapper';
import { AddressOrmEntity } from './address.orm-entity';
import { UserMapper } from './user.mapper';
import { UserOrmEntity } from './user.orm-entity';

/** Search point; `ST_MakePoint` takes longitude first. */
const POINT = 'ST_SetSRID(ST_MakePoint(:long, :lat), 4326)::geography';
/** KNN operator: served by the GiST index on `location`. */
const BY_DISTANCE = `a.location <-> ${POINT}`;
/** Meters on the WGS84 spheroid. */
const DISTANCE = `ST_Distance(a.location, ${POINT})`;

type TOrderedQuery = {
  query: SelectQueryBuilder<AddressOrmEntity>;
  /** Selected as "distance"; omitted: null. */
  distance?: string;
};

/** PostGIS over `addresses.location` (generated from lat/long), joined with `users`. */
@Injectable()
export class PgDistributorSearchRepository
  extends TypeOrmRepositoryBase<AddressOrmEntity>
  implements IDistributorSearchRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, AddressOrmEntity);
  }

  async searchWithinRadius(
    point: Coordinates,
    radiusMeters: number,
    page: TDistributorSearchPage,
  ): Promise<TDistributorSearchResult> {
    const query = this.distributors()
      .andWhere(`ST_DWithin(a.location, ${POINT}, :radiusMeters)`)
      .setParameters({ lat: point.lat, long: point.long, radiusMeters })
      .orderBy(BY_DISTANCE)
      .addOrderBy('u.id');
    return this.run({ query, distance: DISTANCE }, page);
  }

  async searchNearest(
    point: Coordinates,
    page: TDistributorSearchPage,
  ): Promise<TDistributorSearchResult> {
    const query = this.distributors()
      .setParameters({ lat: point.lat, long: point.long })
      .orderBy(BY_DISTANCE)
      .addOrderBy('u.id');
    return this.run({ query, distance: DISTANCE }, page);
  }

  async searchInProvince(
    provinceCode: string,
    wardCode: string | null,
    page: TDistributorSearchPage,
  ): Promise<TDistributorSearchResult> {
    const query = this.distributors()
      .andWhere('a.province = :provinceCode', { provinceCode })
      .orderBy('CASE WHEN a.ward = :wardCode THEN 0 ELSE 1 END')
      .setParameter('wardCode', wardCode)
      .addOrderBy('u.username')
      .addOrderBy('u.id');
    return this.run({ query }, page);
  }

  async searchNationwide(
    page: TDistributorSearchPage,
  ): Promise<TDistributorSearchResult> {
    const query = this.distributors().orderBy('u.username').addOrderBy('u.id');
    return this.run({ query }, page);
  }

  /** Primary addresses of ACTIVE distributors. */
  private distributors(): SelectQueryBuilder<AddressOrmEntity> {
    return this.repository
      .createQueryBuilder('a')
      .innerJoin(UserOrmEntity, 'u', 'u.id = a.userId')
      .where('a.isPrimary = true')
      .andWhere('u.role = :role', { role: EUserRole.DISTRIBUTOR })
      .andWhere('u.status = :status', { status: EUserStatus.ACTIVE });
  }

  /** Counts, reads one page of ids in order, then loads the rows through the mappers. */
  private async run(
    { query, distance }: TOrderedQuery,
    page: TDistributorSearchPage,
  ): Promise<TDistributorSearchResult> {
    const total = await query.getCount();
    if (total <= page.offset) {
      return { items: [], total };
    }
    const hits = await query
      .select('a.id', 'addressId')
      .addSelect('u.id', 'userId')
      .addSelect(distance ?? 'NULL', 'distance')
      .offset(page.offset)
      .limit(page.limit)
      .getRawMany<{
        addressId: string;
        userId: string;
        distance: number | null;
      }>();

    const [addressRows, userRows] = await Promise.all([
      this.repository.findBy({ id: In(hits.map((hit) => hit.addressId)) }),
      this.repository.manager
        .getRepository(UserOrmEntity)
        .findBy({ id: In(hits.map((hit) => hit.userId)) }),
    ]);
    const addresses = new Map(addressRows.map((row) => [row.id, row]));
    const users = new Map(userRows.map((row) => [row.id, row]));

    return {
      total,
      items: hits.flatMap((hit) => {
        const address = addresses.get(hit.addressId);
        const user = users.get(hit.userId);
        return address && user
          ? [
              {
                distributor: UserMapper.toDomain(user),
                address: AddressMapper.toDomain(address),
                distanceMeters:
                  hit.distance === null ? null : Number(hit.distance),
              },
            ]
          : [];
      }),
    };
  }
}
