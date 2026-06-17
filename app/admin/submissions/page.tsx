import { adminDb, ADMIN_DEV_MODE } from "@/lib/firebase-admin";
import { AdminHeader } from "@/components/admin/Header";
import type { PortfolioItem, Provider } from "@/lib/types";
import Link from "next/link";

// ─── Mock data ────────────────────────────────────────────────────────────────
// Images from picsum.photos — seeded for consistency, free public placeholder service

const DEV_ITEMS: PortfolioItem[] = [
  {
    id: "dev-sub-001", provider_id: "dev-uid-001",
    title: "Fintech rebrand — full brand identity",
    cover_image: "https://picsum.photos/seed/fintech1/800/600",
    template_type: "before_after",
    blocks: [],
    category: "Branding, Design & Identity", tags: ["rebrand", "fintech", "logo"],
    status: "pending", quality_tier: "Gold", ocr_flagged: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "dev-sub-002", provider_id: "dev-uid-002",
    title: "Social media kit — fashion brand",
    cover_image: "https://picsum.photos/seed/fashion2/800/600",
    template_type: "image_portfolio",
    blocks: [],
    category: "Digital Marketing & E-Commerce", tags: ["fashion", "instagram", "content"],
    status: "pending", quality_tier: "Silver", ocr_flagged: true,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "dev-sub-003", provider_id: "dev-uid-003",
    title: "E-commerce product video — 30s ad",
    cover_image: "https://picsum.photos/seed/product3/800/600",
    template_type: "video_showcase",
    blocks: [],
    category: "Video, Film & Entertainment", tags: ["product", "ecommerce", "ad"],
    status: "pending", quality_tier: "Bronze", ocr_flagged: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "dev-sub-004", provider_id: "dev-uid-001",
    title: "Pitch deck design — agri-tech startup",
    cover_image: "https://picsum.photos/seed/pitch4/800/600",
    template_type: "case_study",
    blocks: [],
    category: "Business, Corporate & Financial Services", tags: ["pitch-deck", "startup", "design"],
    status: "pending", quality_tier: "Gold", ocr_flagged: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "dev-sub-005", provider_id: "dev-uid-002",
    title: "UI/UX redesign — mobile banking app",
    cover_image: "https://picsum.photos/seed/ux5/800/600",
    template_type: "case_study",
    blocks: [],
    category: "Digital & Creative Economy", tags: ["UI/UX", "mobile", "banking"],
    status: "pending", quality_tier: "Gold", ocr_flagged: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "dev-sub-006", provider_id: "dev-uid-003",
    title: "Motion graphics — brand intro reel",
    cover_image: "https://picsum.photos/seed/motion6/800/600",
    template_type: "video_showcase",
    blocks: [],
    category: "Video, Film & Entertainment", tags: ["motion", "animation", "brand"],
    status: "pending", quality_tier: "Silver", ocr_flagged: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
];

const DEV_PROVIDERS: Map<string, Provider> = new Map([
  ["dev-uid-001", { id: "dev-uid-001", uid: "dev-uid-001", first_name: "Dara", last_name: "Okunade", name: "Dara Okunade", phone: "+2348012345678", category: "Branding, Design & Identity", subcategories: [], skills: ["Logo Design", "Brand Identity Systems"], quality_tier: "Gold", availability: "available", onboarding_complete: true, created_at: "", updated_at: "" }],
  ["dev-uid-002", { id: "dev-uid-002", uid: "dev-uid-002", first_name: "Emeka", last_name: "Okafor", name: "Emeka Okafor", phone: "+2348023456789", category: "Digital Marketing & E-Commerce", subcategories: [], skills: ["Social Media Management"], quality_tier: "Silver", availability: "available", onboarding_complete: true, created_at: "", updated_at: "" }],
  ["dev-uid-003", { id: "dev-uid-003", uid: "dev-uid-003", first_name: "Bola", last_name: "Adeyemi", name: "Bola Adeyemi", phone: "+2348034567890", category: "Video, Film & Entertainment", subcategories: [], skills: ["Video Editing (YouTube, TikTok)"], quality_tier: "Bronze", availability: "available", onboarding_complete: true, created_at: "", updated_at: "" }],
]);

// ─── Data fetch ────────────────────────────────────────────────────────────────

async function getPendingSubmissions() {
  if (ADMIN_DEV_MODE) return { items: DEV_ITEMS, providers: DEV_PROVIDERS };
  try {
    const snap = await adminDb
      .collection("portfolio_items")
      .where("status", "==", "pending")
      .orderBy("created_at", "desc")
      .limit(50)
      .get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PortfolioItem[];
    const providerIds = [...new Set(items.map((i) => i.provider_id))];
    const providers = new Map<string, Provider>();
    await Promise.all(
      providerIds.map(async (id) => {
        const d = await adminDb.collection("providers").doc(id).get();
        if (d.exists) providers.set(id, { id: d.id, ...d.data() } as Provider);
      })
    );
    return { items, providers };
  } catch {
    return { items: [], providers: new Map<string, Provider>() };
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function SubmissionsPage() {
  const { items, providers } = await getPendingSubmissions();

  return (
    <>
      <AdminHeader
        title="Pending Submissions"
        subtitle={`${items.length} item${items.length !== 1 ? "s" : ""} awaiting review`}
      />
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#00EFFE]/10 flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-[#00EFFE]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-gray-900 text-lg mb-2">All caught up</h3>
            <p className="text-gray-400 text-[14px]">No submissions pending review.</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
            {items.map((item) => (
              <SubmissionCard key={item.id} item={item} provider={providers.get(item.provider_id)} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

// ─── Behance-style card ────────────────────────────────────────────────────────

function SubmissionCard({ item, provider }: { item: PortfolioItem; provider?: Provider }) {
  const initials = provider?.name
    ?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  return (
    <Link href={`/admin/submissions/${item.id}`}
      className="block break-inside-avoid group cursor-pointer">

      {/* Image block */}
      <div className="relative overflow-hidden rounded-2xl bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.cover_image}
          alt={item.title}
          className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />

        {/* Bottom gradient + "Review" CTA on hover */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end px-4 pb-4">
          <span className="text-white text-[13px] font-semibold tracking-tight">
            Review submission →
          </span>
        </div>

        {/* OCR flag */}
        {item.ocr_flagged && (
          <div className="absolute top-3 right-3 bg-red-500/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            OCR
          </div>
        )}
      </div>

      {/* Meta below image — like Behance */}
      <div className="px-1 pt-3 pb-5">
        <h3 className="font-display font-semibold text-gray-900 text-[14px] leading-snug line-clamp-1 mb-1.5">
          {item.title}
        </h3>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Provider avatar */}
            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-600 flex-shrink-0">
              {initials}
            </div>
            <span className="text-[12px] text-gray-500 truncate">
              {provider?.name ?? "Unknown"} · {item.category.split(",")[0].trim()}
            </span>
          </div>
          {/* Tags */}
          {item.tags?.[0] && (
            <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
              {item.tags[0]}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
