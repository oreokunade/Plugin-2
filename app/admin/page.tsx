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
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-2xl space-y-5">

          {/* Primary action */}
          <Link href="/admin/submissions"
            className={`block rounded-2xl p-7 transition-all hover:shadow-[var(--card-shadow-lg)] group shadow-[var(--card-shadow)] ${
              stats.pending > 0
                ? "bg-amber-50"
                : "bg-white"
            }`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                stats.pending > 0 ? "bg-amber-100" : "bg-gray-100"
              }`}>
                <svg className={`w-6 h-6 ${stats.pending > 0 ? "text-amber-600" : "text-gray-400"}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors mt-1"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className={`font-display font-bold text-4xl mb-1.5 ${
              stats.pending > 0 ? "text-amber-700" : "text-gray-900"
            }`}>{stats.pending}</p>
            <p className={`text-[15px] font-semibold ${stats.pending > 0 ? "text-amber-700" : "text-gray-600"}`}>
              {stats.pending === 1 ? "submission" : "submissions"} pending review
            </p>
            <p className={`text-[13px] mt-1 ${stats.pending > 0 ? "text-amber-500" : "text-gray-400"}`}>
              {stats.pending > 0 ? "Tap to review →" : "You're all caught up"}
            </p>
          </Link>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl shadow-[var(--card-shadow)] p-6">
              <p className="font-display font-bold text-3xl text-gray-900 mb-1">{stats.approved}</p>
              <p className="text-[13px] text-gray-500">portfolio items live</p>
            </div>
            <div className="bg-white rounded-2xl shadow-[var(--card-shadow)] p-6">
              <p className="font-display font-bold text-3xl text-gray-900 mb-1">{stats.providers}</p>
              <p className="text-[13px] text-gray-500">providers onboarded</p>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
