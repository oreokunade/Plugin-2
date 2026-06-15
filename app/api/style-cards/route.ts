import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rankItems } from "@/lib/ranking";
import { sanitizePortfolioItem, assertNoLeak } from "@/lib/sanitize";
import type { StyleCard, PortfolioItem, PublicStyleCard, PublicPortfolioItem } from "@/lib/types";

/**
 * GET /api/style-cards?category={category}
 * Returns style cards for visual categories only.
 * Each card includes 2-3 anonymized portfolio samples.
 */
export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");

  if (!category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }

  try {
    const styleSnap = await adminDb
      .collection("style_cards")
      .where("category", "==", category)
      .limit(6)
      .get();

    if (styleSnap.empty) {
      return NextResponse.json({ style_cards: [] });
    }

    const styleCards = styleSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as StyleCard[];

    const enriched: PublicStyleCard[] = await Promise.all(
      styleCards.map(async (card) => {
        let sampleItems: PublicPortfolioItem[] = [];

        if (card.portfolio_item_ids?.length > 0) {
          const itemSnap = await adminDb
            .collection("portfolio_items")
            .where("__name__", "in", card.portfolio_item_ids.slice(0, 10))
            .where("status", "==", "approved")
            .get();

          const items = itemSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as PortfolioItem[];

          const ranked = rankItems(items, { category, tags: [card.style_label] });
          sampleItems = ranked.slice(0, 3).map((s) => sanitizePortfolioItem(s.item));
        }

        return {
          id: card.id,
          category: card.category,
          style_label: card.style_label,
          description: card.description,
          sample_items: sampleItems,
        } satisfies PublicStyleCard;
      })
    );

    assertNoLeak(enriched);

    return NextResponse.json({ style_cards: enriched });
  } catch (err) {
    console.error("[/api/style-cards]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
