import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  OptionalAccessTokenGuard,
  OptionalCurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import {
  FindNearbyDistributorsUseCase,
  GetDistributorProfileUseCase,
  TFindNearbyDistributorsInput,
} from '../../application/use-cases';
import {
  DEFAULT_NEARBY_PAGE_SIZE,
  FindNearbyDistributorsQueryDto,
} from './dto';
import { DistributorProfileResponse } from './responses/distributor-profile.response';
import { FindNearbyDistributorsResponse } from './responses/find-nearby-distributors.response';

@Controller('distributors')
export class DistributorController {
  constructor(
    private readonly findNearbyDistributors: FindNearbyDistributorsUseCase,
    private readonly getDistributorProfile: GetDistributorProfileUseCase,
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

  /** Public. Declared after `nearby` so that path is not taken as an id. */
  @Get(':distributorId')
  async getProfile(
    @Param('distributorId', ParseUUIDPipe) distributorId: string,
  ): Promise<DistributorProfileResponse> {
    const profile = await this.getDistributorProfile.execute({
      distributorId,
    });
    return {
      id: profile.id,
      email: profile.email,
      phone: profile.phone,
      username: profile.username,
      avatar: profile.avatar,
      bio: profile.bio,
      bussinessType: profile.businessType,
      bussinessLicense: profile.businessLicense,
      createdAt: profile.createdAt,
      address: profile.address,
    };
  }
}
