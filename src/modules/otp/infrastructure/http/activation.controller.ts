import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { VerifyActivationOtpUseCase } from '../../application/use-cases';
import { ActivateAccountDto } from './dto';

@Controller('auth')
export class ActivationController {
  constructor(
    private readonly verifyActivationOtp: VerifyActivationOtpUseCase,
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
}
