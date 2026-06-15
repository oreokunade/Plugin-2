import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { rankItems } from "@/lib/ranking";
import { sanitizePortfolioItem, assertNoLeak } from "@/lib/sanitize";
import type { OutcomeCard, PortfolioItem, PublicOutcomeCard, PublicPortfolioItem } from "@/lib/types";

/**
 * GET /api/outcomes?category={category}
 * Returns 3 ranked outcome cards for the given service category.
 * All provider identity is stripped server-side.
 */
export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");

  if (!category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }

  try {
    // Fetch outcome cards for this category
    const outcomesSnap = await adminDb
      .collection("outcome_cards")
      .where("category", "==", category)
      .limit(10)
      .get();

    if (outcomesSnap.empty) {
      return NextResponse.json({ outcomes: [] });
    }

    const outcomeCards = outcomesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as OutcomeCard[];

    // For each outcome card, fetch and rank its approved portfolio items only
    const enriched: PublicOutcomeCard[] = await Promise.all(
      outcomeCards.map(async (card) => {
        let sampleItems: PublicPortfolioItem[] = [];

        if (card.linked_portfolio_item_ids?.length > 0) {
          const itemSnap = await adminDb
            .collection("portfolio_items")
            .where("__name__", "in", card.linked_portfolio_item_ids.slice(0, 10))
            .where("status", "==", "approved")
            .get();

          const items = itemSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as PortfolioItem[];

          const ranked = rankItems(items, { category, tags: [card.title] });
          sampleItems = ranked.slice(0, 3).map((s) => sanitizePortfolioItem(s.item));
        }

        return {
          id: card.id,
          title: card.title,
          description: card.description,
          category: card.category,
          example_outputs: card.example_outputs ?? [],
          sample_items: sampleItems,
        } satisfies PublicOutcomeCard;
      })
    );

    // Limit to 3 outcome cards — highest relevance first
    const result = enriched.slice(0, 3);

    // Final anti-leak guard
    assertNoLeak(result);

    // Log views (fire and forget)
    result.forEach((card) => {
      adminDb
        .collection("engagement_logs")
        .doc(card.id)
        .set({ views: FieldValue.increment(1) }, { merge: true })
        .catch(() => null);
    });

    return NextResponse.json({ outcomes: result });
  } catch (err) {
    console.error("[/api/outcomes]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
