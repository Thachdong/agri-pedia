import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { RequestPasswordResetOtpUseCase } from '../../application/use-cases';
import { RequestPasswordResetDto } from './dto';

@Controller('auth')
export class PasswordResetController {
  constructor(
    private readonly requestPasswordResetOtp: RequestPasswordResetOtpUseCase,
  ) {}

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async requestReset(@Body() dto: RequestPasswordResetDto): Promise<null> {
    await this.requestPasswordResetOtp.execute({
      loginType: dto.loginType,
      identifier: dto.identifier,
    });
    return null;
  }
}
