import Link from "next/link";
import { AdminHeader } from "@/components/admin/Header";
import { adminDb } from "@/lib/firebase-admin";
import type { StyleCard } from "@/lib/types";

async function getStyleCards(): Promise<StyleCard[]> {
  try {
    const snap = await adminDb
      .collection("style_cards")
      .orderBy("created_at", "desc")
      .limit(50)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as StyleCard[];
  } catch {
    return [];
  }
}

const STYLE_COLORS: Record<string, string> = {
  "Clean & Minimal": "bg-gray-100 text-gray-700",
  "Bold & Modern": "bg-near-black text-cyan",
  "Premium & Corporate": "bg-dark-teal text-white",
};

export default async function StyleCardsPage() {
  const cards = await getStyleCards();

  return (
    <>
      <AdminHeader
        title="Style Cards"
        subtitle={`${cards.length} cards — visual categories only`}
        action={{ label: "New Style Card", href: "/admin/style-cards/new" }}
      />
      <main className="flex-1 p-6 overflow-auto">
        {cards.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <StyleCardItem key={card.id} card={card} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function StyleCardItem({ card }: { card: StyleCard }) {
  const colorCls = STYLE_COLORS[card.style_label] ?? "bg-blue/10 text-blue";
  return (
    <div className="bg-white rounded-2xl shadow-[var(--card-shadow)] overflow-hidden hover:shadow-[var(--card-shadow-lg)] transition-shadow">
      <div className={`px-5 py-3 ${colorCls}`}>
        <p className="text-sm font-semibold">{card.style_label}</p>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold bg-cyan/15 text-dark-teal px-2.5 py-1 rounded-full">
            {card.category}
          </span>
          <Link
            href={`/admin/style-cards/${card.id}/edit`}
            className="text-xs text-gray-400 hover:text-blue transition-colors"
          >
            Edit
          </Link>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{card.description}</p>
        <div className="text-xs text-gray-400">
          {card.portfolio_item_ids?.length ?? 0} portfolio items
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-blue/10 rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="font-display font-700 text-gray-900 mb-2">No style cards yet</h3>
      <p className="text-gray-500 text-sm mb-6">Style cards are used for visual categories like Design, Video, and Photography.</p>
      <Link
        href="/admin/style-cards/new"
        className="bg-cyan hover:bg-cyan-dark text-near-black text-sm font-semibold px-5 py-2.5 rounded-[10px] transition-colors"
      >
        Create Style Card
      </Link>
    </div>
  );
}
