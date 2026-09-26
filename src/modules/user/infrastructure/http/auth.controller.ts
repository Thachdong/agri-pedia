import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  LoginUserUseCase,
  RegisterUserUseCase,
} from '../../application/use-cases';
import { LoginUserDto, RegisterUserDto } from './dto';
import { LoginUserResponse } from './responses/login-user.response';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
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
        loginType: user.loginType,
        username: user.username,
        role: user.role,
        bussinessType: user.businessType,
        bussinessLicense: user.businessLicense,
        avatar: user.avatar,
        bio: user.bio,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }
}
