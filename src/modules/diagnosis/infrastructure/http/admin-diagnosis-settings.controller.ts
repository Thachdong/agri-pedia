import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import {
  GetDiagnosisSettingsUseCase,
  UpdateDiagnosisSettingsUseCase,
} from '../../application/use-cases';
import { UpdateDiagnosisSettingsDto } from './dto';
import { DiagnosisSettingsResponse } from './responses/diagnosis-settings.response';

/** Diagnosis settings for ADMIN accounts (role checked by the use cases). */
@Controller('admin/diagnosis')
@UseGuards(AccessTokenGuard)
export class AdminDiagnosisSettingsController {
  constructor(
    private readonly getSettings: GetDiagnosisSettingsUseCase,
    private readonly updateSettings: UpdateDiagnosisSettingsUseCase,
  ) {}

  @Get('settings')
  async get(
    @CurrentUser() caller: TAccessTokenPayload,
  ): Promise<DiagnosisSettingsResponse> {
    return this.getSettings.execute({ userId: caller.userId });
  }

  @Put('settings')
  async update(
    @CurrentUser() caller: TAccessTokenPayload,
    @Body() dto: UpdateDiagnosisSettingsDto,
  ): Promise<DiagnosisSettingsResponse> {
    return this.updateSettings.execute({
      userId: caller.userId,
      dailyFreeLimit: dto.dailyFreeLimit,
      defaultCropType: dto.defaultCropType,
      maxImages: dto.maxImages,
      maxImageBytes: dto.maxImageBytes,
      maxImageWidth: dto.maxImageWidth,
      maxImageHeight: dto.maxImageHeight,
    });
  }
}
