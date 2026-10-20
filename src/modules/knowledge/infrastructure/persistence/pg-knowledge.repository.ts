import { Injectable } from '@nestjs/common';
import { DataSource, In, Not, Repository } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { IKnowledgeRepository } from '../../application/ports';
import { Crop, Disease } from '../../domain';
import { CropOrmEntity } from './crop.orm-entity';
import { DiseaseOrmEntity } from './disease.orm-entity';
import { KnowledgeMapper } from './knowledge.mapper';

@Injectable()
export class PgKnowledgeRepository
  extends TypeOrmRepositoryBase<DiseaseOrmEntity>
  implements IKnowledgeRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, DiseaseOrmEntity);
  }

  /** Same manager (and transaction, if any) as `repository`. */
  private get crops(): Repository<CropOrmEntity> {
    return this.repository.manager.getRepository(CropOrmEntity);
  }

  async listEnabledCrops(): Promise<Crop[]> {
    const rows = await this.crops.find({
      where: { enabled: true },
      order: { sortOrder: 'ASC', code: 'ASC' },
    });
    return rows.map((row) => KnowledgeMapper.cropToDomain(row));
  }

  async listCrops(): Promise<Crop[]> {
    const rows = await this.crops.find({
      order: { sortOrder: 'ASC', code: 'ASC' },
    });
    return rows.map((row) => KnowledgeMapper.cropToDomain(row));
  }

  async findCrop(code: string): Promise<Crop | null> {
    const row = await this.crops.findOneBy({ code });
    return row ? KnowledgeMapper.cropToDomain(row) : null;
  }

  async findCropBySlug(slug: string): Promise<Crop | null> {
    const row = await this.crops.findOneBy({ slug });
    return row ? KnowledgeMapper.cropToDomain(row) : null;
  }

  async listDiseasesByCrop(cropType: string): Promise<Disease[]> {
    const rows = await this.repository.findBy({ cropType });
    return rows.map((row) => KnowledgeMapper.diseaseToDomain(row));
  }

  async findDisease(code: string): Promise<Disease | null> {
    const row = await this.repository.findOneBy({ code });
    return row ? KnowledgeMapper.diseaseToDomain(row) : null;
  }

  async findDiseasesByCodes(codes: string[]): Promise<Disease[]> {
    if (codes.length === 0) return [];
    const rows = await this.repository.findBy({ code: In(codes) });
    return rows.map((row) => KnowledgeMapper.diseaseToDomain(row));
  }

  async replaceKnowledgeBase(
    crops: Crop[],
    diseases: Disease[],
  ): Promise<void> {
    const cropCodes = crops.map((crop) => crop.code);
    await this.crops.update(
      cropCodes.length > 0 ? { code: Not(In(cropCodes)) } : {},
      { enabled: false },
    );
    await this.crops.upsert(
      crops.map((crop) => KnowledgeMapper.cropToOrm(crop)),
      ['code'],
    );
    for (const crop of crops) {
      const kept = diseases
        .filter((disease) => disease.cropType === crop.code)
        .map((disease) => disease.code);
      await this.repository.delete({
        cropType: crop.code,
        ...(kept.length > 0 ? { code: Not(In(kept)) } : {}),
      });
    }
    if (diseases.length > 0) {
      await this.repository.upsert(
        diseases.map((disease) => KnowledgeMapper.diseaseToOrm(disease)),
        ['code'],
      );
    }
  }
}
