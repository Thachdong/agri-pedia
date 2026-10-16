import { IConfigService } from '@shared/config';
import { InMemoryLogger } from '@shared/logger';
import {
  NextArticleCacheInvalidator,
  RETRY_DELAYS_MS,
} from './next-article-cache-invalidator';

const SECRET = 's'.repeat(32);
const REVALIDATE_URL = 'https://client.test/api/revalidate';

class TestInvalidator extends NextArticleCacheInvalidator {
  readonly waits: number[] = [];

  protected async wait(ms: number): Promise<void> {
    this.waits.push(ms);
  }
}

function setup(url: string | undefined = REVALIDATE_URL) {
  const config = {
    get: () => ({ articleRevalidateUrl: url, articleRevalidateSecret: SECRET }),
  } as unknown as IConfigService;
  const logger = new InMemoryLogger();
  return { logger, invalidator: new TestInvalidator(config, logger) };
}

describe('NextArticleCacheInvalidator', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => fetchMock.mockRestore());

  it('posts the tags with the secret header', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const { invalidator } = setup();

    await invalidator.invalidate(['articles', 'articles:lua']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://client.test/api/revalidate');
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-revalidate-secret': SECRET,
      },
      body: JSON.stringify({ tags: ['articles', 'articles:lua'] }),
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(invalidator.waits).toEqual([]);
  });

  it('retries errors and non-2xx with 5s / 15s / 45s waits', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const { invalidator, logger } = setup();

    await invalidator.invalidate(['articles']);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(invalidator.waits).toEqual([5000, 15000]);
    expect(logger.entries.at(-1)).toMatchObject({
      level: 'info',
      meta: { attempt: 2 },
    });
  });

  it('logs a warning after the last retry, without throwing', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    const { invalidator, logger } = setup();

    await expect(invalidator.invalidate(['articles'])).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(RETRY_DELAYS_MS.length + 1);
    expect(invalidator.waits).toEqual(RETRY_DELAYS_MS);
    expect(logger.entries.at(-1)).toMatchObject({
      level: 'warn',
      message: 'Article revalidation failed',
      meta: { tags: ['articles'], lastError: 'HTTP 500' },
    });
  });

  it('skips the call when no URL is configured', async () => {
    const { invalidator, logger } = setup('');

    await invalidator.invalidate(['articles']);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(logger.entries.at(-1)).toMatchObject({ level: 'info' });
  });
});
