"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { StatusBadge, TierBadge as TierBadgeComponent } from "@/components/ui/Badge";
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
  { id: "dev-001", provider_id: "dev-uid-001", title: "Fintech rebrand — complete brand identity", cover_image: "https://picsum.photos/seed/fintech1/800/600", template_type: "before_after", blocks: [], category: "Brand Identity", tags: ["rebrand", "fintech"], status: "approved", quality_tier: "Gold", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "dev-002", provider_id: "dev-uid-001", title: "Social media kit for fashion label", cover_image: "https://picsum.photos/seed/fashion2/800/600", template_type: "image_portfolio", blocks: [], category: "Social Media", tags: ["fashion", "instagram"], status: "pending", quality_tier: "Silver", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "dev-003", provider_id: "dev-uid-001", title: "Pitch deck — agri-tech startup", cover_image: "https://picsum.photos/seed/pitch4/800/600", template_type: "case_study", blocks: [], category: "Graphic Design", tags: ["pitch-deck"], status: "rejected", quality_tier: "Bronze", admin_notes: "Images are too low resolution — please re-upload at 1080p or higher.", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "dev-004", provider_id: "dev-uid-001", title: "E-commerce product video — 30s ad", cover_image: "https://picsum.photos/seed/product3/800/600", template_type: "video_showcase", blocks: [], category: "Video Production", tags: ["ecommerce", "video", "ad"], status: "approved", quality_tier: "Gold", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];


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
              className="hidden sm:inline-flex items-center gap-1.5 bg-[#00EFFE] hover:bg-[#00D4E0] text-[#0A0A0A] text-sm font-semibold px-3.5 py-2.5 rounded-lg transition-colors"
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
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="flex items-center gap-1.5 text-gray-400 flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" /></svg>
                    Service
                  </span>
                  <span className="font-medium text-gray-800 text-right leading-tight">{provider?.category}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                    Tier
                  </span>
                  <TierBadgeComponent tier={provider?.quality_tier ?? "Bronze"} />
                </div>
                <div className="pt-0.5">
                  <p className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304-.001a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546.001a6.75 6.75 0 010 9.545M12 12h.008v.008H12V12z" /></svg>
                    Availability
                  </p>
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
                              : s === "busy"      ? "bg-[#FFCC25] border-[#FFCC25] text-[#0A0A0A]"
                              : "bg-[#FF4555] border-[#FF4555] text-white"
                            : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                        } disabled:opacity-60`}>
                        {s === "unavailable" ? "Away" : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {provider?.bio && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                  <p className="text-xs text-gray-500 leading-relaxed">{provider.bio}</p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-2">
              <StatRow count={live}     label="Live"       color="text-[#0D5C6F]"  bg="bg-[#00EFFE]/10"  border="border-[#00EFFE]/25"  icon={
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              } iconColor="text-[#00EFFE]" />
              <StatRow count={pending}  label="In Review"  color="text-[#7A5800]"  bg="bg-[#FFCC25]/10"  border="border-[#FFCC25]/30"  icon={
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              } iconColor="text-[#FFCC25]" />
              <StatRow count={rejected} label="Needs Work" color="text-[#FF4555]"  bg="bg-[#FF4555]/8"   border="border-[#FF4555]/20"  icon={
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              } iconColor="text-[#FF4555]" />
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
                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                  {items.length > 0 && (
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                  )}
                  {items.length === 0
                    ? "Upload your first project to get started"
                    : `${items.length} project${items.length !== 1 ? "s" : ""} in your portfolio`}
                </p>
              </div>
              <Link
                href="/dashboard/upload"
                className="sm:hidden flex items-center gap-1.5 bg-[#00EFFE] hover:bg-[#00D4E0] text-[#0A0A0A] text-sm font-semibold px-3 py-2.5 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add
              </Link>
            </div>


            {/* Projects grid — Behance-style masonry */}
            {items.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="columns-1 sm:columns-2 xl:columns-3 gap-5 space-y-5">
                {items.map((item) => (
                  <div key={item.id} className="break-inside-avoid mb-5">
                    <ProjectCard item={item} />
                  </div>
                ))}
                {/* Add project card */}
                <div className="break-inside-avoid mb-5">
                  <Link
                    href="/dashboard/upload"
                    className="flex flex-col items-center justify-center gap-3 text-center rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#00EFFE] transition-colors group aspect-[4/3]"
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
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatRow({ count, label, color, bg, border, icon, iconColor }: {
  count: number; label: string; color: string; bg: string; border: string;
  icon: React.ReactNode; iconColor: string;
}) {
  return (
    <div className={`${bg} border ${border} rounded-xl p-3 lg:flex lg:items-center lg:justify-between`}>
      <div className="flex items-center gap-1.5 mb-1 lg:mb-0">
        <span className={`flex-shrink-0 ${iconColor}`}>{icon}</span>
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <span className={`font-display font-bold text-xl lg:text-base ${color} block lg:inline`}>{count}</span>
    </div>
  );
}

function ProjectCard({ item }: { item: PortfolioItem }) {
  return (
    <div className="group">
      {/* Image */}
      <div className="relative overflow-hidden rounded-2xl bg-gray-100 aspect-[4/3]">
        {item.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.cover_image}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 18h16.5" />
            </svg>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-all duration-300" />

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={item.status} />
        </div>

        {/* Feedback panel — sits inside the image card at the bottom */}
        {item.status === "rejected" && item.admin_notes && (
          <div className="absolute bottom-0 inset-x-0 bg-[#0A0A0A]/80 backdrop-blur-md px-4 py-3.5">
            <p className="text-[10px] font-bold text-[#FF4555] uppercase tracking-wider mb-1">Feedback</p>
            <p className="text-[11px] text-white/75 leading-relaxed line-clamp-2">{item.admin_notes}</p>
            <Link href="/dashboard/upload"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF4555] hover:opacity-75 transition-opacity">
              Re-upload →
            </Link>
          </div>
        )}
      </div>

      {/* Info below — Behance style */}
      <div className="pt-3 pb-1">
        <p className="font-display font-semibold text-gray-900 text-[14px] leading-snug line-clamp-1 mb-2">
          {item.title}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-gray-400">{item.category}</span>
          {item.tags?.slice(0, 2).map((tag) => (
            <>
              <span className="text-gray-200">·</span>
              <span key={tag} className="text-[11px] text-gray-400">{tag}</span>
            </>
          ))}
        </div>
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
        className="inline-flex items-center gap-2 bg-[#00EFFE] hover:bg-[#00D4E0] text-[#0A0A0A] text-sm font-semibold px-5 py-3.5 rounded-xl transition-colors"
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
