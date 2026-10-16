import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import {
  CreateDiagnosisUseCase,
  GetDiagnosisUseCase,
  ListMyDiagnosesUseCase,
  SubmitDiagnosisFeedbackUseCase,
} from '../../application/use-cases';
import {
  CreateDiagnosisDto,
  DEFAULT_DIAGNOSIS_PAGE_SIZE,
  ListMyDiagnosesQueryDto,
  SubmitDiagnosisFeedbackDto,
} from './dto';
import {
  CreateDiagnosisResponse,
  GetDiagnosisResponse,
  ListMyDiagnosesResponse,
} from './responses/diagnosis.response';

/**
 * Upload guard only: files are kept in memory, so the parser stops far above the business limits
 * (count and DIAGNOSIS_MAX_IMAGE_BYTES are checked by the use case, with per-file details).
 */
const UPLOAD_LIMITS = { files: 10, fileSize: 20 * 1024 * 1024 };

@Controller('diagnoses')
@UseGuards(AccessTokenGuard)
export class DiagnosisController {
  constructor(
    private readonly createDiagnosis: CreateDiagnosisUseCase,
    private readonly getDiagnosis: GetDiagnosisUseCase,
    private readonly listMyDiagnoses: ListMyDiagnosesUseCase,
    private readonly submitDiagnosisFeedback: SubmitDiagnosisFeedbackUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FilesInterceptor('images', UPLOAD_LIMITS.files, { limits: UPLOAD_LIMITS }),
  )
  async create(
    @CurrentUser() caller: TAccessTokenPayload,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Body() dto: CreateDiagnosisDto,
  ): Promise<CreateDiagnosisResponse> {
    return this.createDiagnosis.execute({
      userId: caller.userId,
      cropType: dto.meta.cropType,
      note: dto.meta.note ?? null,
      files: (files ?? []).map((file) => file.buffer),
      plantParts: dto.meta.images.map((image) => image.plantPart),
    });
  }

  @Get()
  async listMine(
    @CurrentUser() caller: TAccessTokenPayload,
    @Query() query: ListMyDiagnosesQueryDto,
  ): Promise<ListMyDiagnosesResponse> {
    return this.listMyDiagnoses.execute({
      userId: caller.userId,
      cursor: query.cursor,
      limit: query.limit ?? DEFAULT_DIAGNOSIS_PAGE_SIZE,
    });
  }

  @Get(':diagnosisId')
  async get(
    @CurrentUser() caller: TAccessTokenPayload,
    @Param('diagnosisId', ParseUUIDPipe) diagnosisId: string,
  ): Promise<GetDiagnosisResponse> {
    return this.getDiagnosis.execute({ userId: caller.userId, diagnosisId });
  }

  @Post(':diagnosisId/feedback')
  @HttpCode(HttpStatus.OK)
  async feedback(
    @CurrentUser() caller: TAccessTokenPayload,
    @Param('diagnosisId', ParseUUIDPipe) diagnosisId: string,
    @Body() dto: SubmitDiagnosisFeedbackDto,
  ): Promise<null> {
    await this.submitDiagnosisFeedback.execute({
      userId: caller.userId,
      diagnosisId,
      feedback: dto.feedback,
      comment: dto.comment ?? null,
    });
    return null;
  }
}
