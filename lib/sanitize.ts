import type { PortfolioItem, PublicPortfolioItem } from "./types";

export function sanitizePortfolioItem(item: PortfolioItem): PublicPortfolioItem {
  return {
    id:           item.id,
    category:     item.category,
    tags:         item.tags,
    cover_image:  item.cover_image,
    blocks:       item.blocks,
    quality_tier: item.quality_tier,
  };
}

export function assertNoLeak(obj: unknown): void {
  const forbidden = ["provider_id", "provider_name", "contact_info", "external_links", "name", "email", "phone", "whatsapp"];
  const str = JSON.stringify(obj);
  for (const field of forbidden) {
    if (new RegExp(`"${field}"\\s*:`).test(str)) {
      throw new Error(`[ANTI-LEAK] Forbidden field "${field}" detected in API response`);
    }
  }
}

export function sanitizeMediaUrls(urls: string[]): string[] {
  return urls.filter((url) => {
    try {
      const parsed = new URL(url);
      return (
        parsed.hostname.includes("storage.googleapis.com") ||
        parsed.hostname.includes("firebasestorage.googleapis.com")
      );
    } catch {
      return false;
    }
  });
}
