import { IArticleSource, TArticleSeed } from '../article-source';

export class InMemoryArticleSource implements IArticleSource {
  constructor(public seeds: TArticleSeed[] = []) {}

  async load(): Promise<TArticleSeed[]> {
    return this.seeds;
  }
}
