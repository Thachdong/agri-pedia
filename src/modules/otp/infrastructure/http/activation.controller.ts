import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ResendActivationOtpUseCase,
  VerifyActivationOtpUseCase,
} from '../../application/use-cases';
import { ActivateAccountDto, ResendActivationCodeDto } from './dto';

@Controller('auth')
export class ActivationController {
  constructor(
    private readonly verifyActivationOtp: VerifyActivationOtpUseCase,
    private readonly resendActivationOtp: ResendActivationOtpUseCase,
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
  async resend(@Body() dto: ResendActivationCodeDto): Promise<null> {
    await this.resendActivationOtp.execute({ identifier: dto.identifier });
    return null;
  }
}
