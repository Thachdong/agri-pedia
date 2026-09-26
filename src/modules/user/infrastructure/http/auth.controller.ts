import { Body, Controller, Post } from '@nestjs/common';
import { RegisterUserUseCase } from '../../application/use-cases';
import { RegisterUserDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly registerUser: RegisterUserUseCase) {}

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
}
