import { AdminHeader } from "@/components/admin/Header";
import { adminDb, ADMIN_DEV_MODE } from "@/lib/firebase-admin";
import Link from "next/link";

async function getStats() {
  if (ADMIN_DEV_MODE) {
    return { pending: 3, approved: 28, providers: 12, rejected: 5, available: 9 };
  }
  try {
    const [pending, approved, rejected, providers, available] = await Promise.all([
      adminDb.collection("portfolio_items").where("status", "==", "pending").count().get(),
      adminDb.collection("portfolio_items").where("status", "==", "approved").count().get(),
      adminDb.collection("portfolio_items").where("status", "==", "rejected").count().get(),
      adminDb.collection("providers").count().get(),
      adminDb.collection("providers").where("availability", "==", "available").count().get(),
    ]);
    return {
      pending:   pending.data().count,
      approved:  approved.data().count,
      rejected:  rejected.data().count,
      providers: providers.data().count,
      available: available.data().count,
    };
  } catch {
    return { pending: 0, approved: 0, rejected: 0, providers: 0, available: 0 };
  }
}

// ─── Shared icon style ────────────────────────────────────────────────────────
// All icons: w-[18px] h-[18px], stroke-[1.5], text-gray-400

export default async function AdminDashboard() {
  const stats = await getStats();
  const total = stats.approved + stats.rejected;
  const approvalRate = total > 0 ? Math.round((stats.approved / total) * 100) : 0;

  return (
    <>
      <AdminHeader title="Overview" />
      <main className="flex-1 overflow-auto flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 pt-6 sm:pt-10 lg:pt-14">
        <div className="w-full max-w-[600px] space-y-3">

          {/* Pending action card */}
          <Link href="/admin/submissions"
            className={`flex items-center justify-between rounded-2xl px-6 py-5 border transition-colors group ${
              stats.pending > 0
                ? "bg-white border-amber-200 hover:border-amber-300"
                : "bg-white border-gray-100 hover:border-gray-200"
            }`}>
            <div className="flex items-center gap-4">
              {/* Bare icon, no wrapper */}
              <svg className={`w-[18px] h-[18px] flex-shrink-0 ${stats.pending > 0 ? "text-amber-400" : "text-gray-300"}`}
                fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <div>
                <span className={`font-display font-bold text-5xl leading-none tracking-tight ${
                  stats.pending > 0 ? "text-gray-900" : "text-gray-300"
                }`}>{stats.pending}</span>
                <p className={`text-[13px] font-medium mt-1 ${
                  stats.pending > 0 ? "text-gray-500" : "text-gray-400"
                }`}>
                  {stats.pending === 1 ? "submission" : "submissions"} pending review
                </p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors flex-shrink-0"
              fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* Divider */}
          <div className="pt-2 pb-1">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Metrics</p>
          </div>

          {/* 2×2 stat grid — no shadows, hairline borders */}
          <div className="grid grid-cols-2 gap-3">

            <StatCard
              icon={
                <svg className="w-[18px] h-[18px] text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 18h16.5M12 3v9" />
                </svg>
              }
              value={stats.approved}
              label="portfolio items live"
            />

            <StatCard
              href="/admin/providers"
              icon={
                <svg className="w-[18px] h-[18px] text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              }
              value={stats.providers}
              label="providers onboarded"
              sub={`${stats.available} available`}
            />

            <StatCard
              icon={
                <svg className="w-[18px] h-[18px] text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              }
              value={stats.rejected}
              label="items needing rework"
            />

            <StatCard
              icon={
                <svg className="w-[18px] h-[18px] text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              }
              value={`${approvalRate}%`}
              label="approval rate"
            />

          </div>
        </div>
      </main>
    </>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon, value, label, sub, href,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sub?: string;
  href?: string;
}) {
  const cls = "bg-white border border-gray-100 rounded-2xl px-5 py-5 hover:border-gray-200 transition-colors block";

  const content = (
    <>
      <div className="mb-3">{icon}</div>
      <p className="font-display font-bold text-[32px] leading-none tracking-tight text-gray-900 mb-1.5">
        {value}
      </p>
      <p className="text-[12px] text-gray-400 font-medium leading-tight">
        {label}
        {sub && <span className="text-emerald-500 font-semibold ml-1.5">{sub}</span>}
      </p>
    </>
  );

  return href
    ? <Link href={href} className={cls}>{content}</Link>
    : <div className={cls}>{content}</div>;
}
