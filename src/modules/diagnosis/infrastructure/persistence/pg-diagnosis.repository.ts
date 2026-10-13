import { Injectable } from '@nestjs/common';
import { DataSource, In, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import {
  IDiagnosisRepository,
  TDiagnosisPageKey,
} from '../../application/ports';
import { Diagnosis, EDiagnosisStatus } from '../../domain';
import { DiagnosisImageOrmEntity } from './diagnosis-image.orm-entity';
import { DiagnosisMapper } from './diagnosis.mapper';
import { DiagnosisOrmEntity } from './diagnosis.orm-entity';

@Injectable()
export class PgDiagnosisRepository
  extends TypeOrmRepositoryBase<DiagnosisOrmEntity>
  implements IDiagnosisRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, DiagnosisOrmEntity);
  }

  /** Same manager (and transaction, if any) as `repository`. */
  private get images(): Repository<DiagnosisImageOrmEntity> {
    return this.repository.manager.getRepository(DiagnosisImageOrmEntity);
  }

  async findById(id: string): Promise<Diagnosis | null> {
    const row = await this.repository.findOneBy({ id });
    return row ? (await this.withImages([row]))[0] : null;
  }

  async findByIdForUser(id: string, userId: string): Promise<Diagnosis | null> {
    const row = await this.repository.findOneBy({ id, userId });
    return row ? (await this.withImages([row]))[0] : null;
  }

  async findByUser(
    userId: string,
    { after, limit }: { after?: TDiagnosisPageKey; limit: number },
  ): Promise<Diagnosis[]> {
    const query = this.repository
      .createQueryBuilder('diagnosis')
      .where('diagnosis.user_id = :userId', { userId });
    if (after) {
      // Row comparison matches the (created_at desc, id desc) order and uses IDX_diagnoses_user_created_id.
      query.andWhere(
        '(diagnosis.created_at, diagnosis.id) < (:createdAt, :id)',
        {
          createdAt: after.createdAt,
          id: after.id,
        },
      );
    }
    const rows = await query
      .orderBy('diagnosis.created_at', 'DESC')
      .addOrderBy('diagnosis.id', 'DESC')
      .limit(limit)
      .getMany();
    return this.withImages(rows);
  }

  async findProcessingCreatedBefore(before: Date): Promise<Diagnosis[]> {
    const rows = await this.repository.findBy({
      status: EDiagnosisStatus.PROCESSING,
      createdAt: LessThan(before),
    });
    return this.withImages(rows);
  }

  async save(diagnosis: Diagnosis): Promise<void> {
    await this.repository.save(DiagnosisMapper.toOrm(diagnosis));
    await this.images.save(DiagnosisMapper.imagesToOrm(diagnosis));
  }

  async countByUserSince(userId: string, since: Date): Promise<number> {
    return this.repository.countBy({
      userId,
      createdAt: MoreThanOrEqual(since),
    });
  }

  private async withImages(rows: DiagnosisOrmEntity[]): Promise<Diagnosis[]> {
    if (rows.length === 0) return [];
    const images = await this.images.find({
      where: { diagnosisId: In(rows.map((row) => row.id)) },
      order: { sortOrder: 'ASC' },
    });
    return rows.map((row) =>
      DiagnosisMapper.toDomain(
        row,
        images.filter((image) => image.diagnosisId === row.id),
      ),
    );
  }
}
