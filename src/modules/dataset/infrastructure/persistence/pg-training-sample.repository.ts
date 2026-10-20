import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { ITrainingSampleRepository } from '../../application/ports';
import { TrainingSample } from '../../domain';
import { TrainingSampleMapper } from './training-sample.mapper';
import { TrainingSampleOrmEntity } from './training-sample.orm-entity';

@Injectable()
export class PgTrainingSampleRepository
  extends TypeOrmRepositoryBase<TrainingSampleOrmEntity>
  implements ITrainingSampleRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, TrainingSampleOrmEntity);
  }

  async exists(diagnosisId: string, sortOrder: number): Promise<boolean> {
    return this.repository.existsBy({ diagnosisId, sortOrder });
  }

  async save(sample: TrainingSample): Promise<void> {
    await this.repository.save(TrainingSampleMapper.toOrm(sample));
  }
}
