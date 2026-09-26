import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ResendOtpUseCase,
  VerifyActivationOtpUseCase,
} from '../../application/use-cases';
import { ActivateAccountDto, ResendCodeDto } from './dto';

@Controller('auth')
export class ActivationController {
  constructor(
    private readonly verifyActivationOtp: VerifyActivationOtpUseCase,
    private readonly resendOtp: ResendOtpUseCase,
  ) {}

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Body() dto: ActivateAccountDto): Promise<null> {
    await this.verifyActivationOtp.execute({
      identifier: dto.identifier,
      code: dto.code,
    });
    return null;
  }

  @Post('resend')
  @HttpCode(HttpStatus.OK)
  async resend(@Body() dto: ResendCodeDto): Promise<null> {
    await this.resendOtp.execute({
      identifier: dto.identifier,
      purpose: dto.purpose,
    });
    return null;
  }
}
