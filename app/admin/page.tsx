import { AdminHeader } from "@/components/admin/Header";
import { adminDb, ADMIN_DEV_MODE } from "@/lib/firebase-admin";
import Link from "next/link";

async function getStats() {
  if (ADMIN_DEV_MODE) return { pending: 3, approved: 28, providers: 12 };
  try {
    const [pending, approved, providers] = await Promise.all([
      adminDb.collection("portfolio_items").where("status", "==", "pending").count().get(),
      adminDb.collection("portfolio_items").where("status", "==", "approved").count().get(),
      adminDb.collection("providers").count().get(),
    ]);
    return {
      pending:   pending.data().count,
      approved:  approved.data().count,
      providers: providers.data().count,
    };
  } catch {
    return { pending: 0, approved: 0, providers: 0 };
  }
}

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <>
      <AdminHeader title="Overview" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-lg space-y-4">

          {/* Primary action — the whole point of admin */}
          <Link href="/admin/submissions"
            className={`block rounded-2xl border p-6 transition-all hover:shadow-md group ${
              stats.pending > 0
                ? "bg-amber-50 border-amber-200 hover:border-amber-300"
                : "bg-white border-gray-200"
            }`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                stats.pending > 0 ? "bg-amber-100" : "bg-gray-100"
              }`}>
                <svg className={`w-5 h-5 ${stats.pending > 0 ? "text-amber-600" : "text-gray-400"}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors mt-1"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className={`font-display font-bold text-3xl mb-1 ${
              stats.pending > 0 ? "text-amber-700" : "text-gray-900"
            }`}>{stats.pending}</p>
            <p className={`text-sm font-semibold ${stats.pending > 0 ? "text-amber-700" : "text-gray-600"}`}>
              {stats.pending === 1 ? "submission" : "submissions"} pending review
            </p>
            <p className={`text-xs mt-0.5 ${stats.pending > 0 ? "text-amber-500" : "text-gray-400"}`}>
              {stats.pending > 0 ? "Tap to review →" : "You're all caught up"}
            </p>
          </Link>

          {/* Secondary stats — read-only context */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4">
              <p className="font-display font-bold text-2xl text-gray-900 mb-0.5">{stats.approved}</p>
              <p className="text-xs text-gray-500">items live</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4">
              <p className="font-display font-bold text-2xl text-gray-900 mb-0.5">{stats.providers}</p>
              <p className="text-xs text-gray-500">providers onboarded</p>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
