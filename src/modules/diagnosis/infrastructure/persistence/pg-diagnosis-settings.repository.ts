import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { IDiagnosisSettingsRepository } from '../../application/ports';
import { DiagnosisSettings } from '../../domain';
import { DiagnosisSettingsMapper } from './diagnosis-settings.mapper';
import {
  DIAGNOSIS_SETTINGS_ROW_ID,
  DiagnosisSettingsOrmEntity,
} from './diagnosis-settings.orm-entity';

@Injectable()
export class PgDiagnosisSettingsRepository
  extends TypeOrmRepositoryBase<DiagnosisSettingsOrmEntity>
  implements IDiagnosisSettingsRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, DiagnosisSettingsOrmEntity);
  }

  async get(): Promise<DiagnosisSettings> {
    const row = await this.repository.findOneBy({
      id: DIAGNOSIS_SETTINGS_ROW_ID,
    });
    return row
      ? DiagnosisSettingsMapper.toDomain(row)
      : DiagnosisSettings.defaults();
  }

  async save(settings: DiagnosisSettings): Promise<void> {
    await this.repository.save(DiagnosisSettingsMapper.toOrm(settings));
  }
}
