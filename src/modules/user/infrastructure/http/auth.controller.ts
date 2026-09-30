import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import {
  ChangePasswordUseCase,
  LoginUserUseCase,
  LogoutUserUseCase,
  RefreshAccessTokenUseCase,
  RegisterUserUseCase,
} from '../../application/use-cases';
import {
  ChangePasswordDto,
  LoginUserDto,
  LogoutUserDto,
  RefreshAccessTokenDto,
  RegisterUserDto,
} from './dto';
import { LoginUserResponse } from './responses/login-user.response';
import { RefreshAccessTokenResponse } from './responses/refresh-access-token.response';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
    private readonly refreshAccessToken: RefreshAccessTokenUseCase,
    private readonly logoutUser: LogoutUserUseCase,
    private readonly changeUserPassword: ChangePasswordUseCase,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterUserDto): Promise<null> {
    await this.registerUser.execute({
      loginType: dto.loginType,
      identifier: dto.identifier,
      password: dto.password,
      username: dto.username,
      role: dto.role,
      businessType: dto.bussinessType ?? null,
      bio: dto.bio,
      address: {
        province: dto.address.province,
        ward: dto.address.ward,
        houseNumber: dto.address.houseNumber,
        lat: dto.address.lat,
        long: dto.address.long,
      },
    });
    return null;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginUserDto): Promise<LoginUserResponse> {
    const { accessToken, refreshToken, user } = await this.loginUser.execute({
      loginType: dto.loginType,
      identifier: dto.identifier,
      password: dto.password,
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        loginType: user.loginType,
        username: user.username,
        role: user.role,
        bussinessType: user.businessType,
        bussinessLicense: user.businessLicense,
        avatar: user.avatar,
        bio: user.bio,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        address: user.address && {
          province: user.address.province,
          ward: user.address.ward,
          houseNumber: user.address.houseNumber,
          lat: user.address.lat,
          long: user.address.long,
        },
      },
    };
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() dto: RefreshAccessTokenDto,
  ): Promise<RefreshAccessTokenResponse> {
    const { accessToken, refreshToken } = await this.refreshAccessToken.execute(
      {
        refreshToken: dto.refreshToken,
      },
    );
    return { accessToken, refreshToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async logout(
    @CurrentUser() caller: TAccessTokenPayload,
    @Body() dto: LogoutUserDto,
  ): Promise<null> {
    await this.logoutUser.execute({
      userId: caller.userId,
      refreshToken: dto.refreshToken,
    });
    return null;
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async changePassword(
    @CurrentUser() caller: TAccessTokenPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<null> {
    await this.changeUserPassword.execute({
      userId: caller.userId,
      oldPassword: dto.oldPassword,
      newPassword: dto.newPassword,
    });
    return null;
  }
}
