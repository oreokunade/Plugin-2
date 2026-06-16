"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { auth, db, DEV_MODE } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { setAvailability } from "./actions";
import type { Provider, PortfolioItem, SubmissionStatus } from "@/lib/types";

// ─── Dev mock data ────────────────────────────────────────────────────────────

const DEV_PROVIDER: Provider = {
  id: "dev-uid-001", uid: "dev-uid-001",
  phone: "+2348012345678", first_name: "Dara", last_name: "Okunade", name: "Dara Okunade",
  category: "Branding, Design & Identity",
  subcategories: ["Logo Design", "Brand Identity Systems", "Packaging Design"],
  bio: "5 years building brands for Nigerian startups.",
  skills: ["Logo Design", "Brand Guidelines", "Typography"],
  quality_tier: "Gold", availability: "available", onboarding_complete: true,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

const DEV_ITEMS: PortfolioItem[] = [
  { id: "dev-001", provider_id: "dev-uid-001", title: "Fintech rebrand — complete brand identity", cover_image: "/mock/cover-fintech.svg", template_type: "before_after", blocks: [], category: "Brand Identity", tags: ["rebrand", "fintech"], status: "approved", quality_tier: "Gold", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "dev-002", provider_id: "dev-uid-001", title: "Social media kit for fashion label", cover_image: "/mock/cover-fashion.svg", template_type: "image_portfolio", blocks: [], category: "Social Media", tags: ["fashion", "instagram"], status: "pending", quality_tier: "Silver", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "dev-003", provider_id: "dev-uid-001", title: "Pitch deck — agri-tech startup", cover_image: "/mock/cover-fintech.svg", template_type: "case_study", blocks: [], category: "Graphic Design", tags: ["pitch-deck"], status: "rejected", quality_tier: "Bronze", admin_notes: "Images are too low resolution — please re-upload at 1080p or higher.", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "dev-004", provider_id: "dev-uid-001", title: "E-commerce product video — 30s ad", cover_image: "/mock/cover-video.svg", template_type: "video_showcase", blocks: [], category: "Video Production", tags: ["ecommerce", "video", "ad"], status: "approved", quality_tier: "Gold", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<SubmissionStatus, { label: string; dot: string; text: string; bg: string; border: string }> = {
  approved: { label: "Live",         dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" },
  pending:  { label: "Under Review", dot: "bg-amber-400",   text: "text-amber-700",  bg: "bg-amber-50",    border: "border-amber-200"   },
  rejected: { label: "Needs Work",   dot: "bg-red-500",     text: "text-red-700",    bg: "bg-red-50",       border: "border-red-200"     },
};

const TEMPLATE_LABELS: Record<string, string> = {
  image_portfolio: "Image Portfolio",
  case_study:      "Case Study",
  video_showcase:  "Video",
  before_after:    "Before & After",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const justUploaded = searchParams.get("uploaded") === "true";

  const [provider,      setProvider]      = useState<Provider | null>(null);
  const [items,         setItems]         = useState<PortfolioItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [toast,         setToast]         = useState(justUploaded);
  const [availability,  setAvailState]    = useState<"available" | "busy" | "unavailable">("available");
  const [availPending,  startAvailTx]     = useTransition();

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(false), 3500); return () => clearTimeout(t); }
  }, [toast]);

  useEffect(() => {
    if (DEV_MODE) { setProvider(DEV_PROVIDER); setItems(DEV_ITEMS); setAvailState(DEV_PROVIDER.availability); setLoading(false); return; }
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { router.replace("/onboard"); return; }
      const [provSnap, itemsSnap] = await Promise.all([
        getDoc(doc(db, "providers", user.uid)),
        getDocs(query(collection(db, "portfolio_items"), where("provider_id", "==", user.uid))),
      ]);
      if (!provSnap.exists()) { router.replace("/onboard"); return; }
      const p = { id: provSnap.id, ...provSnap.data() } as Provider;
      setProvider(p);
      setAvailState(p.availability ?? "available");
      setItems(itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as PortfolioItem[]);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const live     = items.filter((i) => i.status === "approved").length;
  const pending  = items.filter((i) => i.status === "pending").length;
  const rejected = items.filter((i) => i.status === "rejected").length;

  if (loading) return <LoadingScreen />;

  const firstName = provider?.name?.split(" ")[0] ?? "there";
  const initials  = provider?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-4 inset-x-4 z-50 flex justify-center pointer-events-none">
          <div className="flex items-center gap-2.5 bg-white border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 shadow-lg text-sm font-medium">
            <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Submitted! We&apos;ll review your project within 24 hours.
          </div>
        </div>
      )}

      {/* ── Top nav ───────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <Logo variant="full" height={22} />

          {/* Right side */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/upload"
              className="hidden sm:inline-flex items-center gap-1.5 bg-[#00EFFE] hover:bg-[#00D4E0] text-[#0A0A0A] text-sm font-semibold px-3.5 py-1.5 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add project
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600">
                {initials}
              </div>
              <button
                onClick={() => DEV_MODE ? router.replace("/onboard") : auth.signOut().then(() => router.replace("/onboard"))}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors hidden sm:inline"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">

          {/* ── Left sidebar (desktop) / Top section (mobile) ─────────────── */}
          <aside className="mb-6 lg:mb-0">
            {/* Profile card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#00EFFE] to-[#0C5BEE] rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="font-display font-semibold text-gray-900 text-sm truncate">{provider?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{provider?.phone}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Primary service</span>
                  <span className="font-medium text-gray-800">{provider?.category}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Quality tier</span>
                  <TierPill tier={provider?.quality_tier ?? "Bronze"} />
                </div>
                <div className="pt-1">
                  <p className="text-xs text-gray-500 mb-2">Availability</p>
                  <div className="flex gap-1.5">
                    {(["available", "busy", "unavailable"] as const).map((s) => (
                      <button key={s} disabled={availPending}
                        onClick={() => {
                          setAvailState(s);
                          startAvailTx(async () => {
                            await setAvailability(provider?.uid ?? provider?.id ?? "", s);
                          });
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold capitalize transition-all border ${
                          availability === s
                            ? s === "available"   ? "bg-emerald-500 border-emerald-500 text-white"
                              : s === "busy"      ? "bg-amber-400 border-amber-400 text-white"
                              : "bg-red-500 border-red-500 text-white"
                            : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                        } disabled:opacity-60`}>
                        {s === "unavailable" ? "away" : s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {provider?.bio && (
                <p className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">{provider.bio}</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-2">
              <StatRow count={live}     label="Live"         color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-100" dot="bg-emerald-500" />
              <StatRow count={pending}  label="In Review"    color="text-amber-600"   bg="bg-amber-50"   border="border-amber-100"   dot="bg-amber-400"   />
              <StatRow count={rejected} label="Needs Work"   color="text-red-600"     bg="bg-red-50"     border="border-red-100"     dot="bg-red-500"     />
            </div>

            {/* Tip */}
            {items.length > 0 && items.length < 3 && (
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 hidden lg:block">
                <p className="text-xs font-semibold text-blue-800 mb-1">💡 Add more projects</p>
                <p className="text-xs text-blue-600 leading-relaxed">
                  Providers with 3+ approved projects get matched to clients 4× more often.
                </p>
              </div>
            )}
          </aside>

          {/* ── Main content ───────────────────────────────────────────────── */}
          <main>
            {/* Page header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="font-display font-bold text-gray-900 text-xl">
                  Hey, {firstName} 👋
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {items.length === 0
                    ? "Upload your first project to get started"
                    : `${items.length} project${items.length !== 1 ? "s" : ""} in your portfolio`}
                </p>
              </div>
              <Link
                href="/dashboard/upload"
                className="sm:hidden flex items-center gap-1.5 bg-[#00EFFE] hover:bg-[#00D4E0] text-[#0A0A0A] text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add
              </Link>
            </div>

            {/* Alerts */}
            {rejected > 0 && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700">
                  <span className="font-semibold">{rejected} project{rejected > 1 ? "s need" : " needs"} attention.</span>{" "}
                  Check the feedback below and re-upload.
                </p>
              </div>
            )}

            {/* Projects grid */}
            {items.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => <ProjectCard key={item.id} item={item} />)}
                {/* Add project card */}
                <Link
                  href="/dashboard/upload"
                  className="border-2 border-dashed border-gray-200 hover:border-[#00EFFE] rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-center transition-colors group min-h-[180px]"
                >
                  <div className="w-10 h-10 bg-gray-100 group-hover:bg-[#00EFFE]/10 rounded-xl flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-[#00EFFE] transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 group-hover:text-gray-700 transition-colors">Add project</p>
                    <p className="text-xs text-gray-400 mt-0.5">Upload more of your work</p>
                  </div>
                </Link>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatRow({ count, label, color, bg, border, dot }: { count: number; label: string; color: string; bg: string; border: string; dot: string }) {
  return (
    <div className={`${bg} border ${border} rounded-xl p-3 lg:flex lg:items-center lg:justify-between`}>
      <div className="flex items-center gap-2 mb-1 lg:mb-0">
        <span className={`w-2 h-2 rounded-full ${dot} flex-shrink-0`} />
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <span className={`font-display font-bold text-xl lg:text-base ${color} block lg:inline`}>{count}</span>
    </div>
  );
}

function TierPill({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    Gold:   "bg-yellow-50 text-yellow-700 border-yellow-200",
    Silver: "bg-gray-100 text-gray-600 border-gray-200",
    Bronze: "bg-orange-50 text-orange-700 border-orange-200",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colors[tier] ?? colors.Bronze}`}>
      {tier}
    </span>
  );
}

function ProjectCard({ item }: { item: PortfolioItem }) {
  const s = STATUS[item.status] ?? STATUS.pending;
  const templateLabel = TEMPLATE_LABELS[item.template_type] ?? item.template_type;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow group">
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-100 overflow-hidden relative">
        {item.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 18h16.5" />
            </svg>
          </div>
        )}
        {/* Status badge on image */}
        <div className="absolute top-2.5 right-2.5">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${s.bg} ${s.text} ${s.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="font-display font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">{item.title}</p>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-500">{item.category}</span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-400">{templateLabel}</span>
        </div>
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        )}
        {item.status === "rejected" && item.admin_notes && (
          <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-red-600 leading-relaxed">{item.admin_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl px-6 py-16 text-center">
      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 18h16.5M12 3v9m0 0l-3-3m3 3l3-3" />
        </svg>
      </div>
      <p className="font-display font-semibold text-gray-900 mb-1.5">No projects yet</p>
      <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto leading-relaxed">
        Upload your first project so clients can see the quality of your work.
      </p>
      <Link
        href="/dashboard/upload"
        className="inline-flex items-center gap-2 bg-[#00EFFE] hover:bg-[#00D4E0] text-[#0A0A0A] text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
      >
        Upload first project →
      </Link>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-[#00EFFE] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    </div>
  );
}
