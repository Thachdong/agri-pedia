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
import { GetPresignUrlUseCase } from '../../application/use-cases';
import { GetPresignUrlDto } from './dto';
import { GetPresignUrlResponse } from './responses/get-presign-url.response';

@Controller('media')
export class MediaController {
  constructor(private readonly getPresignUrl: GetPresignUrlUseCase) {}

  @Post('presign-url')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async presignUrl(
    @CurrentUser() caller: TAccessTokenPayload,
    @Body() dto: GetPresignUrlDto,
  ): Promise<GetPresignUrlResponse> {
    const { items } = await this.getPresignUrl.execute({
      userId: caller.userId,
      files: [{ type: dto.type, extension: dto.extension }],
    });
    const { presignUrl, key, headers } = items[0];
    return { presignUrl, key, headers };
  }
}
