import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryFileStorage } from '@shared/storage';
import {
  KnowledgeAdminRequiredException,
  KnowledgeCropNotFoundException,
  KnowledgeInvalidTopArticleSettingsException,
  KnowledgeTopArticlesInvalidException,
} from '../../domain';
import {
  ADMIN_ID,
  buildArticle,
  buildCrop,
  buildDisease,
  FARMER_ID,
  InMemoryArticleRepository,
  InMemoryCropTopArticlesRepository,
  InMemoryKnowledgeRepository,
  InMemoryTopArticleSettingsRepository,
  stubUserQuery,
} from '../ports/fakes';
import { GetCropTopArticlesUseCase } from './get-crop-top-articles.use-case';
import { GetTopArticleSettingsUseCase } from './get-top-article-settings.use-case';
import { ListTopArticlesUseCase } from './list-top-articles.use-case';
import { SetCropTopArticlesUseCase } from './set-crop-top-articles.use-case';
import { UpdateTopArticleSettingsUseCase } from './update-top-article-settings.use-case';

function setup() {
  const knowledge = new InMemoryKnowledgeRepository();
  knowledge.crops.set('RICE', buildCrop('RICE'));
  knowledge.crops.set('CORN', buildCrop('CORN'));
  knowledge.diseases.set('RICE_BLAST', buildDisease({ code: 'RICE_BLAST' }));
  knowledge.diseases.set('RICE_BPH', buildDisease({ code: 'RICE_BPH' }));
  const articles = new InMemoryArticleRepository();
  const blast = buildArticle({ id: 'a-blast', slug: 'dao-on' });
  const bph = buildArticle({
    id: 'a-bph',
    slug: 'ray-nau',
    diseaseCode: 'RICE_BPH',
    title: 'Rầy nâu',
  });
  const hidden = buildArticle({
    id: 'a-hidden',
    slug: 'an',
    diseaseCode: null,
    isPublished: false,
  });
  const corn = buildArticle({ id: 'a-corn', slug: 'gi-sat', cropType: 'CORN' });
  for (const article of [blast, bph, hidden, corn]) {
    articles.articles.set(article.id, article);
  }
  const top = new InMemoryCropTopArticlesRepository();
  const settings = new InMemoryTopArticleSettingsRepository();
  const userQuery = stubUserQuery();
  const unitOfWork = new InMemoryUnitOfWork();
  return {
    knowledge,
    articles,
    top,
    settings,
    hidden,
    getSettings: new GetTopArticleSettingsUseCase(settings, userQuery),
    updateSettings: new UpdateTopArticleSettingsUseCase(
      settings,
      userQuery,
      unitOfWork,
    ),
    getTop: new GetCropTopArticlesUseCase(
      userQuery,
      knowledge,
      articles,
      top,
      settings,
    ),
    setTop: new SetCropTopArticlesUseCase(
      userQuery,
      knowledge,
      articles,
      top,
      settings,
      unitOfWork,
    ),
    listTop: new ListTopArticlesUseCase(
      knowledge,
      articles,
      top,
      settings,
      new InMemoryFileStorage(),
    ),
  };
}

describe('top articles settings', () => {
  it('defaults the limit to 10 and saves a new one', async () => {
    const t = setup();

    await expect(t.getSettings.execute({ userId: ADMIN_ID })).resolves.toEqual({
      limit: 10,
    });
    await expect(
      t.updateSettings.execute({ userId: ADMIN_ID, limit: 4 }),
    ).resolves.toEqual({ limit: 4 });
    expect(t.settings.savedLimit).toBe(4);
  });

  it('rejects a limit out of range', async () => {
    const t = setup();

    await expect(
      t.updateSettings.execute({ userId: ADMIN_ID, limit: 51 }),
    ).rejects.toBeInstanceOf(KnowledgeInvalidTopArticleSettingsException);
    expect(t.settings.savedLimit).toBeNull();
  });

  it('rejects a non-admin', async () => {
    const t = setup();

    await expect(
      t.getSettings.execute({ userId: FARMER_ID }),
    ).rejects.toBeInstanceOf(KnowledgeAdminRequiredException);
    await expect(
      t.updateSettings.execute({ userId: FARMER_ID, limit: 4 }),
    ).rejects.toBeInstanceOf(KnowledgeAdminRequiredException);
  });
});

describe('SetCropTopArticlesUseCase / GetCropTopArticlesUseCase', () => {
  it('saves the articles in order and returns them', async () => {
    const t = setup();

    const result = await t.setTop.execute({
      userId: ADMIN_ID,
      cropSlug: 'lua',
      articleSlugs: ['ray-nau', 'dao-on'],
    });

    expect(t.top.lists.get('RICE')).toEqual(['a-bph', 'a-blast']);
    expect(result.crop).toEqual({ code: 'RICE', slug: 'lua', nameVi: 'Lúa' });
    expect(result.limit).toBe(10);
    expect(result.articles.map((a) => [a.slug, a.path])).toEqual([
      ['ray-nau', '/benh-cay-trong/lua/ray-nau'],
      ['dao-on', '/benh-cay-trong/lua/dao-on'],
    ]);
    await expect(
      t.getTop.execute({ userId: ADMIN_ID, cropSlug: 'lua' }),
    ).resolves.toEqual(result);
  });

  it('clears the list with no slugs', async () => {
    const t = setup();
    t.top.lists.set('RICE', ['a-blast']);

    await t.setTop.execute({
      userId: ADMIN_ID,
      cropSlug: 'lua',
      articleSlugs: [],
    });

    expect(t.top.lists.get('RICE')).toEqual([]);
  });

  it('shows articles unpublished after they were chosen to the admin', async () => {
    const t = setup();
    t.top.lists.set('RICE', ['a-hidden', 'a-blast']);

    const result = await t.getTop.execute({
      userId: ADMIN_ID,
      cropSlug: 'lua',
    });

    expect(result.articles.map((a) => [a.slug, a.isPublished])).toEqual([
      ['an', false],
      ['dao-on', true],
    ]);
  });

  it.each([
    [
      ['dao-on', 'gi-sat', 'nope'],
      'not articles of crop RICE',
      ['gi-sat', 'nope'],
    ],
    [['an'], 'unpublished articles', ['an']],
    [['dao-on', 'ray-nau', 'dao-on'], 'duplicated articles', ['dao-on']],
  ])('rejects %j: %s', async (articleSlugs, reason, articles) => {
    const t = setup();

    await expect(
      t.setTop.execute({ userId: ADMIN_ID, cropSlug: 'lua', articleSlugs }),
    ).rejects.toMatchObject({
      code: 'KNOWLEDGE_TOP_ARTICLES_INVALID',
      details: { reason, articles },
    });
    expect(t.top.lists.has('RICE')).toBe(false);
  });

  it('rejects more articles than the limit', async () => {
    const t = setup();
    t.settings.savedLimit = 1;

    await expect(
      t.setTop.execute({
        userId: ADMIN_ID,
        cropSlug: 'lua',
        articleSlugs: ['dao-on', 'ray-nau'],
      }),
    ).rejects.toBeInstanceOf(KnowledgeTopArticlesInvalidException);
  });

  it('rejects an unknown crop and a non-admin', async () => {
    const t = setup();

    await expect(
      t.getTop.execute({ userId: ADMIN_ID, cropSlug: 'nope' }),
    ).rejects.toBeInstanceOf(KnowledgeCropNotFoundException);
    await expect(
      t.setTop.execute({
        userId: FARMER_ID,
        cropSlug: 'lua',
        articleSlugs: [],
      }),
    ).rejects.toBeInstanceOf(KnowledgeAdminRequiredException);
  });
});

describe('ListTopArticlesUseCase', () => {
  it('lists published top articles in order, at most limit', async () => {
    const t = setup();
    t.top.lists.set('RICE', ['a-hidden', 'a-bph', 'a-blast']);
    t.settings.savedLimit = 1;

    const result = await t.listTop.execute({ crop: 'lua' });

    expect(result.crop).toEqual({
      code: 'RICE',
      slug: 'lua',
      nameVi: 'Lúa',
      diagnosisEnabled: true,
    });
    expect(result.articles).toHaveLength(1);
    expect(result.articles[0]).toMatchObject({
      slug: 'ray-nau',
      path: '/benh-cay-trong/lua/ray-nau',
      disease: { code: 'RICE_BPH' },
    });
  });

  it('is empty when no article was chosen', async () => {
    await expect(
      setup().listTop.execute({ crop: 'lua' }),
    ).resolves.toMatchObject({ articles: [] });
  });

  it('rejects an unknown crop', async () => {
    await expect(
      setup().listTop.execute({ crop: 'nope' }),
    ).rejects.toBeInstanceOf(KnowledgeCropNotFoundException);
  });
});
