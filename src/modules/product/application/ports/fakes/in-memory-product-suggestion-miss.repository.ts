import { ProductSuggestionMiss } from '../../../domain';
import {
  IProductSuggestionMissRepository,
  TProductSuggestionMissSummary,
  TProductSuggestionMissSummaryPage,
} from '../product-suggestion-miss.repository';

export class InMemoryProductSuggestionMissRepository implements IProductSuggestionMissRepository {
  readonly items: ProductSuggestionMiss[] = [];

  async save(miss: ProductSuggestionMiss): Promise<void> {
    this.items.push(miss);
  }

  async listSummaries(query: {
    offset: number;
    limit: number;
  }): Promise<TProductSuggestionMissSummaryPage> {
    const groups = new Map<string, ProductSuggestionMiss[]>();
    for (const miss of this.items) {
      groups.set(miss.normalizedName, [
        ...(groups.get(miss.normalizedName) ?? []),
        miss,
      ]);
    }
    const summaries = [...groups.entries()]
      .map(([normalizedName, misses]): TProductSuggestionMissSummary => {
        const latest = misses.reduce((a, b) =>
          b.createdAt >= a.createdAt ? b : a,
        );
        return {
          normalizedName,
          latestDetectedName: latest.detectedName,
          count: misses.length,
          distributorCount: new Set(misses.map((m) => m.userId)).size,
          lastSeenAt: latest.createdAt,
        };
      })
      .sort(
        (a, b) =>
          b.count - a.count || b.lastSeenAt.getTime() - a.lastSeenAt.getTime(),
      );
    return {
      items: summaries.slice(query.offset, query.offset + query.limit),
      total: summaries.length,
    };
  }
}
