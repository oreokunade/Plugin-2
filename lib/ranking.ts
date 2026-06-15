import type { PortfolioItem, ScoredItem, RankingContext, QualityTier } from "./types";
import { QUALITY_SCORE } from "./types";

const W_QUALITY   = 0.4;
const W_RELEVANCE = 0.4;
const W_DIVERSITY = 0.2;

function qualityScore(tier: QualityTier): number {
  return QUALITY_SCORE[tier] ?? 0.4;
}

function relevanceScore(item: PortfolioItem, ctx: RankingContext): number {
  const catMatch = item.category.toLowerCase() === ctx.category.toLowerCase();
  let score = catMatch ? 1.0 : 0.3;

  // Boost when item tags overlap with the request tags
  if (ctx.tags && ctx.tags.length > 0 && item.tags.length > 0) {
    const itemTagsLower = item.tags.map((t) => t.toLowerCase());

    let matchCount = 0;
    for (const reqTag of ctx.tags) {
      const lowerReq = reqTag.toLowerCase();
      if (itemTagsLower.some((t) => t === lowerReq)) {
        matchCount += 1;          // exact match — full point
      } else if (itemTagsLower.some((t) => t.includes(lowerReq) || lowerReq.includes(t))) {
        matchCount += 0.5;        // partial match — half point
      }
    }

    const tagBoost = Math.min(matchCount / ctx.tags.length, 1.0) * 0.4;
    score = Math.min(score + tagBoost, 1.0);
  }

  return score;
}

function diversityScore(
  item: PortfolioItem,
  providerCounts: Map<string, number>,
  totalItems: number
): number {
  const count = providerCounts.get(item.provider_id) ?? 0;
  const ratio = totalItems > 0 ? count / totalItems : 0;
  if (ratio > 0.4) return 0.7;
  if (ratio < 0.1) return 1.2;
  return 1.0;
}

export function rankItems(items: PortfolioItem[], ctx: RankingContext, limit = 10): ScoredItem[] {
  const providerCounts = new Map<string, number>();
  for (const item of items) {
    providerCounts.set(item.provider_id, (providerCounts.get(item.provider_id) ?? 0) + 1);
  }

  const scored: ScoredItem[] = items.map((item) => {
    const qs = qualityScore(item.quality_tier);
    const rs = relevanceScore(item, ctx);
    const ds = diversityScore(item, providerCounts, items.length);
    const score = W_QUALITY * qs + W_RELEVANCE * rs + W_DIVERSITY * ds;
    return { item, score, quality_score: qs, relevance_score: rs, diversity_score: ds };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function rankProviders(
  scoredItems: ScoredItem[]
): { provider_id: string; score: number; quality_tier: QualityTier; item_count: number; best_item: PortfolioItem }[] {
  const providerMap = new Map<string, {
    total_score: number;
    quality_tier: QualityTier;
    count: number;
    best_item: PortfolioItem;
    best_score: number;
  }>();

  for (const { item, score } of scoredItems) {
    const existing = providerMap.get(item.provider_id);
    if (existing) {
      existing.total_score += score;
      existing.count += 1;
      if (score > existing.best_score) {
        existing.best_score = score;
        existing.best_item  = item;
      }
    } else {
      providerMap.set(item.provider_id, {
        total_score:   score,
        quality_tier:  item.quality_tier,
        count:         1,
        best_item:     item,
        best_score:    score,
      });
    }
  }

  return Array.from(providerMap.entries())
    .map(([provider_id, { total_score, quality_tier, count, best_item }]) => ({
      provider_id,
      score: total_score / count,
      quality_tier,
      item_count: count,
      best_item,
    }))
    .sort((a, b) => b.score - a.score);
}
