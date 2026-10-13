import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  GetDiseaseDetailUseCase,
  ListCropsUseCase,
  ListDiseasesUseCase,
} from '../../application/use-cases';
import { DiseaseParamsDto, ListDiseasesQueryDto } from './dto';
import {
  DiseaseDetailResponse,
  ListCropsResponse,
  ListDiseasesResponse,
} from './responses/knowledge.response';

/** Public knowledge base: no login required. */
@Controller('knowledge')
export class KnowledgeController {
  constructor(
    private readonly listCrops: ListCropsUseCase,
    private readonly listDiseases: ListDiseasesUseCase,
    private readonly getDiseaseDetail: GetDiseaseDetailUseCase,
  ) {}

  @Get('crops')
  async crops(): Promise<ListCropsResponse> {
    return this.listCrops.execute();
  }

  @Get('diseases')
  async diseases(
    @Query() query: ListDiseasesQueryDto,
  ): Promise<ListDiseasesResponse> {
    return this.listDiseases.execute({
      crop: query.crop,
      category: query.category,
      q: query.q,
    });
  }

  @Get('diseases/:code')
  async disease(
    @Param() params: DiseaseParamsDto,
  ): Promise<DiseaseDetailResponse> {
    return this.getDiseaseDetail.execute({ code: params.code });
  }
}
