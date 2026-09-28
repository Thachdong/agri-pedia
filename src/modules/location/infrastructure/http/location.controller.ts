import { Controller, Get, Param } from '@nestjs/common';
import {
  ListProvincesUseCase,
  ListWardsByProvinceUseCase,
} from '../../application/use-cases';
import { ProvinceParamsDto } from './dto';
import {
  ListProvincesResponse,
  ListWardsResponse,
} from './responses/location.response';

/** Public master data: no login required. */
@Controller('provinces')
export class LocationController {
  constructor(
    private readonly listProvinces: ListProvincesUseCase,
    private readonly listWardsByProvince: ListWardsByProvinceUseCase,
  ) {}

  @Get()
  async listAll(): Promise<ListProvincesResponse> {
    const { provinces } = await this.listProvinces.execute();
    return {
      provinces: provinces.map((province) => ({
        codename: province.codename,
        name: province.name,
      })),
    };
  }

  @Get(':provinceCode/wards')
  async listWards(
    @Param() params: ProvinceParamsDto,
  ): Promise<ListWardsResponse> {
    const { wards } = await this.listWardsByProvince.execute({
      provinceCode: params.provinceCode,
    });
    return {
      wards: wards.map((ward) => ({
        codename: ward.codename,
        name: ward.name,
      })),
    };
  }
}
