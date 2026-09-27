import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import { UpdateProfileUseCase } from '../../application/use-cases';
import { UpdateProfileDto } from './dto';
import { UpdateProfileResponse } from './responses/update-profile.response';

@Controller('users')
export class UserController {
  constructor(private readonly updateProfile: UpdateProfileUseCase) {}

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
