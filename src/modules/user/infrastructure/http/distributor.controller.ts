import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  OptionalAccessTokenGuard,
  OptionalCurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import {
  FindNearbyDistributorsUseCase,
  TFindNearbyDistributorsInput,
} from '../../application/use-cases';
import {
  DEFAULT_NEARBY_PAGE_SIZE,
  FindNearbyDistributorsQueryDto,
} from './dto';
import { FindNearbyDistributorsResponse } from './responses/find-nearby-distributors.response';

@Controller('distributors')
export class DistributorController {
  constructor(
    private readonly findNearbyDistributors: FindNearbyDistributorsUseCase,
  ) {}

  /** Public: the access token is optional (used for the caller's address). */
  @Get('nearby')
  @UseGuards(OptionalAccessTokenGuard)
  async findNearby(
    @OptionalCurrentUser() caller: TAccessTokenPayload | null,
    @Query() query: FindNearbyDistributorsQueryDto,
  ): Promise<FindNearbyDistributorsResponse> {
    let location: TFindNearbyDistributorsInput['location'];
    if (query.lat !== undefined && query.long !== undefined) {
      location = { kind: 'point', lat: query.lat, long: query.long };
    } else if (query.provinceCode !== undefined) {
      location = {
        kind: 'area',
        provinceCode: query.provinceCode,
        wardCode: query.wardCode,
      };
    }
    const result = await this.findNearbyDistributors.execute({
      userId: caller?.userId ?? null,
      location,
      page: query.page ?? 1,
      limit: query.limit ?? DEFAULT_NEARBY_PAGE_SIZE,
    });
    return {
      scope: result.scope,
      source: result.source,
      total: result.total,
      items: result.items.map((item) => ({
        userId: item.userId,
        username: item.username,
        avatar: item.avatar,
        bussinessType: item.businessType,
        address: item.address,
        distanceMeters: item.distanceMeters,
      })),
    };
  }
}
