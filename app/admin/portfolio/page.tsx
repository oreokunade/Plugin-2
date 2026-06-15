import Link from "next/link";
import { AdminHeader } from "@/components/admin/Header";
import { adminDb } from "@/lib/firebase-admin";
import { TierBadge, Tag } from "@/components/ui/Badge";
import type { PortfolioItem } from "@/lib/types";

async function getPortfolioItems(): Promise<PortfolioItem[]> {
  try {
    const snap = await adminDb
      .collection("portfolio_items")
      .orderBy("created_at", "desc")
      .limit(100)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as PortfolioItem[];
  } catch {
    return [];
  }
}

export default async function PortfolioPage() {
  const items = await getPortfolioItems();

  return (
    <>
      <AdminHeader
        title="Portfolio Items"
        subtitle={`${items.length} items`}
        action={{ label: "Add Portfolio Item", href: "/admin/portfolio/new" }}
      />
      <main className="flex-1 p-6 overflow-auto">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="bg-white rounded-[16px] border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Category</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Tags</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Template</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Tier</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Media</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-800">{item.category}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.tags?.slice(0, 2).map((tag) => (
                          <Tag key={tag} label={tag} variant="cyan" />
                        ))}
                        {(item.tags?.length ?? 0) > 2 && (
                          <span className="text-xs text-gray-400">+{item.tags.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{item.template_type?.replace("_", " ") ?? "—"}</td>
                    <td className="px-5 py-3">
                      <TierBadge tier={item.quality_tier} />
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {item.cover_image ? "1 cover" : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/portfolio/${item.id}/edit`}
                        className="text-xs text-gray-400 hover:text-blue transition-colors"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-yellow/20 rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-yellow-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h3 className="font-display font-700 text-gray-900 mb-2">No portfolio items yet</h3>
      <p className="text-gray-500 text-sm mb-6">Add anonymized work samples from providers.</p>
      <Link
        href="/admin/portfolio/new"
        className="bg-cyan hover:bg-cyan-dark text-near-black text-sm font-semibold px-5 py-2.5 rounded-[10px] transition-colors"
      >
        Add Portfolio Item
      </Link>
    </div>
  );
}
