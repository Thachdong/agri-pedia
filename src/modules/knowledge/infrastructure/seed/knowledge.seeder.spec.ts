import { HttpAdapterHost } from '@nestjs/core';
import { InMemoryLogger } from '@shared/logger';
import {
  RevalidateArticlesUseCase,
  SeedArticlesUseCase,
  SeedKnowledgeBaseUseCase,
  TSeedArticlesOutput,
} from '../../application/use-cases';
import { KnowledgeSeeder } from './knowledge.seeder';

const CHANGED: TSeedArticlesOutput = {
  upserted: [
    {
      cropSlug: 'lua',
      slug: 'benh-dao-on',
      oldSlug: null,
      diseaseCode: 'RICE_BLAST',
      variantCode: null,
      linkChanged: true,
    },
  ],
  deleted: [],
};

function setup(articles: TSeedArticlesOutput) {
  const host = new HttpAdapterHost();
  const revalidate = { execute: jest.fn().mockResolvedValue({ tags: [] }) };
  const seeder = new KnowledgeSeeder(
    {
      execute: jest.fn().mockResolvedValue({ crops: [], diseaseCount: 0 }),
    } as unknown as SeedKnowledgeBaseUseCase,
    {
      execute: jest.fn().mockResolvedValue(articles),
    } as unknown as SeedArticlesUseCase,
    revalidate as unknown as RevalidateArticlesUseCase,
    host,
    new InMemoryLogger(),
  );
  return { host, revalidate, seeder };
}

describe('KnowledgeSeeder', () => {
  it('revalidates changed articles only once the server listens', async () => {
    const { host, revalidate, seeder } = setup(CHANGED);

    await seeder.onApplicationBootstrap();
    expect(revalidate.execute).not.toHaveBeenCalled();

    host.listening = true;

    expect(revalidate.execute).toHaveBeenCalledWith(CHANGED);
  });

  it('does not revalidate when the seed changed nothing', async () => {
    const { host, revalidate, seeder } = setup({ upserted: [], deleted: [] });

    await seeder.onApplicationBootstrap();
    host.listening = true;

    expect(revalidate.execute).not.toHaveBeenCalled();
  });
});
