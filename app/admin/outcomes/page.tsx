import Link from "next/link";
import { AdminHeader } from "@/components/admin/Header";
import { adminDb } from "@/lib/firebase-admin";
import type { OutcomeCard } from "@/lib/types";

async function getOutcomes(): Promise<OutcomeCard[]> {
  try {
    const snap = await adminDb
      .collection("outcome_cards")
      .orderBy("created_at", "desc")
      .limit(50)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as OutcomeCard[];
  } catch {
    return [];
  }
}

export default async function OutcomesPage() {
  const outcomes = await getOutcomes();

  return (
    <>
      <AdminHeader
        title="Outcome Cards"
        subtitle={`${outcomes.length} cards`}
        action={{ label: "New Outcome Card", href: "/admin/outcomes/new" }}
      />
      <main className="flex-1 p-6 overflow-auto">
        {outcomes.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {outcomes.map((card) => (
              <OutcomeCardItem key={card.id} card={card} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function OutcomeCardItem({ card }: { card: OutcomeCard }) {
  return (
    <div className="bg-white rounded-[16px] border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-semibold bg-cyan/15 text-dark-teal px-2.5 py-1 rounded-full">
          {card.category}
        </span>
        <Link
          href={`/admin/outcomes/${card.id}/edit`}
          className="text-xs text-gray-400 hover:text-blue transition-colors"
        >
          Edit
        </Link>
      </div>
      <h3 className="font-display font-700 text-gray-900 mb-2">{card.title}</h3>
      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{card.description}</p>
      <div className="text-xs text-gray-400">
        {card.linked_portfolio_item_ids?.length ?? 0} linked items ·{" "}
        {card.example_outputs?.length ?? 0} examples
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-cyan/10 rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="font-display font-700 text-gray-900 mb-2">No outcome cards yet</h3>
      <p className="text-gray-500 text-sm mb-6">Create your first outcome card to get started.</p>
      <Link
        href="/admin/outcomes/new"
        className="bg-cyan hover:bg-cyan-dark text-near-black text-sm font-semibold px-5 py-2.5 rounded-[10px] transition-colors"
      >
        Create Outcome Card
      </Link>
    </div>
  );
}
