import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  RequestPasswordResetOtpUseCase,
  VerifyPasswordResetOtpUseCase,
} from '../../application/use-cases';
import { ConfirmPasswordResetDto, RequestPasswordResetDto } from './dto';

@Controller('auth')
export class PasswordResetController {
  constructor(
    private readonly requestPasswordResetOtp: RequestPasswordResetOtpUseCase,
    private readonly verifyPasswordResetOtp: VerifyPasswordResetOtpUseCase,
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

  @Post('reset-password/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmReset(@Body() dto: ConfirmPasswordResetDto): Promise<null> {
    await this.verifyPasswordResetOtp.execute({
      identifier: dto.identifier,
      code: dto.code,
      newPassword: dto.newPassword,
    });
    return null;
  }
}
