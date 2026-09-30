import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import {
  GetMyProfileUseCase,
  UpdateProfileUseCase,
} from '../../application/use-cases';
import { UpdateProfileDto } from './dto';
import { UpdateProfileResponse } from './responses/update-profile.response';
import { UserProfileResponse } from './responses/user-profile.response';

@Controller('users')
export class UserController {
  constructor(
    private readonly getMyProfile: GetMyProfileUseCase,
    private readonly updateProfile: UpdateProfileUseCase,
  ) {}

  @Get('me')
  @UseGuards(AccessTokenGuard)
  async getMe(
    @CurrentUser() caller: TAccessTokenPayload,
  ): Promise<UserProfileResponse> {
    const profile = await this.getMyProfile.execute({ userId: caller.userId });
    return {
      id: profile.id,
      loginType: profile.loginType,
      username: profile.username,
      role: profile.role,
      bussinessType: profile.businessType,
      bussinessLicense: profile.businessLicense,
      avatar: profile.avatar,
      bio: profile.bio,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      address: profile.address && {
        province: profile.address.province,
        ward: profile.address.ward,
        houseNumber: profile.address.houseNumber,
        lat: profile.address.lat,
        long: profile.address.long,
      },
    };
  }

  @Patch('me')
  @UseGuards(AccessTokenGuard)
  async updateMe(
    @CurrentUser() caller: TAccessTokenPayload,
    @Body() dto: UpdateProfileDto,
  ): Promise<UpdateProfileResponse> {
    const profile = await this.updateProfile.execute({
      userId: caller.userId,
      username: dto.username ?? undefined,
      bio: dto.bio ?? undefined,
      businessType: dto.bussinessType,
      avatar: dto.avatar ?? undefined,
      businessLicense: dto.bussinessLicense ?? undefined,
    });
    return {
      username: profile.username,
      avatar: profile.avatar,
      bio: profile.bio,
      bussinessLicense: profile.businessLicense,
      bussinessType: profile.businessType,
      updatedAt: profile.updatedAt,
    };
  }
}
