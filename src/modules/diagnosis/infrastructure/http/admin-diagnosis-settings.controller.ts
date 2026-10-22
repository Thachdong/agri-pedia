import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import {
  GetDiagnosisAiModelsUseCase,
  GetDiagnosisSettingsUseCase,
  UpdateDiagnosisAiModelsUseCase,
  UpdateDiagnosisSettingsUseCase,
} from '../../application/use-cases';
import { UpdateDiagnosisAiModelsDto, UpdateDiagnosisSettingsDto } from './dto';
import {
  DiagnosisAiModelsResponse,
  DiagnosisSettingsResponse,
} from './responses/diagnosis-settings.response';

/** Diagnosis settings for ADMIN accounts (role checked by the use cases). */
@Controller('admin/diagnosis')
@UseGuards(AccessTokenGuard)
export class AdminDiagnosisSettingsController {
  constructor(
    private readonly getSettings: GetDiagnosisSettingsUseCase,
    private readonly updateSettings: UpdateDiagnosisSettingsUseCase,
    private readonly getAiModels: GetDiagnosisAiModelsUseCase,
    private readonly updateAiModels: UpdateDiagnosisAiModelsUseCase,
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

  @Get('ai-models')
  async getModels(
    @CurrentUser() caller: TAccessTokenPayload,
  ): Promise<DiagnosisAiModelsResponse> {
    return this.getAiModels.execute({ userId: caller.userId });
  }

  @Put('ai-models')
  async updateModels(
    @CurrentUser() caller: TAccessTokenPayload,
    @Body() dto: UpdateDiagnosisAiModelsDto,
  ): Promise<DiagnosisAiModelsResponse> {
    return this.updateAiModels.execute({
      userId: caller.userId,
      describeModel: dto.describeModel,
      verifyModel: dto.verifyModel,
    });
  }
}
