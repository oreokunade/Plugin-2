import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rankItems } from "@/lib/ranking";
import { sanitizePortfolioItem, assertNoLeak } from "@/lib/sanitize";
import type { PortfolioItem, OutcomeCard, StyleCard } from "@/lib/types";

/**
 * GET /api/cards/{id}/extended?type=outcome|style&category={category}
 * Returns additional portfolio samples for a given card.
 * Max 2 rounds of expansion per session (enforced client-side per PRD §6).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const type = req.nextUrl.searchParams.get("type") as "outcome" | "style" | null;
  const category = req.nextUrl.searchParams.get("category") ?? "";

  if (!type || !["outcome", "style"].includes(type)) {
    return NextResponse.json({ error: "type must be 'outcome' or 'style'" }, { status: 400 });
  }

  try {
    const collection = type === "outcome" ? "outcome_cards" : "style_cards";
    const cardDoc = await adminDb.collection(collection).doc(id).get();

    if (!cardDoc.exists) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const card = { id: cardDoc.id, ...cardDoc.data() } as OutcomeCard | StyleCard;

    const linkedIds =
      type === "outcome"
        ? (card as OutcomeCard).linked_portfolio_item_ids
        : (card as StyleCard).portfolio_item_ids;

    if (!linkedIds || linkedIds.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Fetch all linked items
    const itemSnap = await adminDb
      .collection("portfolio_items")
      .where("__name__", "in", linkedIds.slice(0, 30))
      .get();

    const items = itemSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PortfolioItem[];

    const ctx =
      type === "outcome"
        ? { category, outcome_tag: (card as OutcomeCard).title }
        : { category, style_tag: (card as StyleCard).style_label };

    const ranked = rankItems(items, ctx);
    // Skip the first 3 (already shown) and return next batch
    const extended = ranked.slice(3, 9).map((s) => sanitizePortfolioItem(s.item));

    assertNoLeak(extended);

    return NextResponse.json({ items: extended });
  } catch (err) {
    console.error("[/api/cards/extended]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
