import { adminDb, ADMIN_DEV_MODE } from "@/lib/firebase-admin";
import { AdminHeader } from "@/components/admin/Header";
import type { PortfolioItem, Provider } from "@/lib/types";
import { MOCK_IMG } from "@/lib/mockImages";
import Link from "next/link";

// ─── Mock data ────────────────────────────────────────────────────────────────
// Topic-matched Unsplash placeholders from lib/mockImages.ts
// Timestamps staggered so the date/time sort is visible in dev mode.

const NOW = Date.now();
const MIN = 60 * 1000;

const DEV_ITEMS: PortfolioItem[] = [
  {
    id: "dev-sub-001", provider_id: "dev-uid-001",
    title: "Fintech rebrand — full brand identity",
    cover_image: MOCK_IMG.branding.cover,
    template_type: "image_portfolio",
    blocks: [],
    category: "Branding, Design & Identity", tags: ["rebrand", "fintech", "logo"],
    status: "pending", quality_tier: "Gold", ocr_flagged: false,
    created_at: new Date(NOW - 8 * MIN).toISOString(), updated_at: new Date(NOW - 8 * MIN).toISOString(),
  },
  {
    id: "dev-sub-002", provider_id: "dev-uid-002",
    title: "Social media kit — fashion brand",
    cover_image: MOCK_IMG.fashion.cover,
    template_type: "image_portfolio",
    blocks: [],
    category: "Digital Marketing & E-Commerce", tags: ["fashion", "instagram", "content"],
    status: "pending", quality_tier: "Silver", ocr_flagged: true,
    created_at: new Date(NOW - 42 * MIN).toISOString(), updated_at: new Date(NOW - 42 * MIN).toISOString(),
  },
  {
    id: "dev-sub-003", provider_id: "dev-uid-003",
    title: "E-commerce product video — 30s ad",
    cover_image: MOCK_IMG.video.cover,
    template_type: "video_showcase",
    blocks: [],
    category: "Video, Film & Entertainment", tags: ["product", "ecommerce", "ad"],
    status: "pending", quality_tier: "Bronze", ocr_flagged: false,
    created_at: new Date(NOW - 3 * 60 * MIN).toISOString(), updated_at: new Date(NOW - 3 * 60 * MIN).toISOString(),
  },
  {
    id: "dev-sub-004", provider_id: "dev-uid-001",
    title: "Pitch deck design — agri-tech startup",
    cover_image: MOCK_IMG.pitch.cover,
    template_type: "case_study",
    blocks: [],
    category: "Business, Corporate & Financial Services", tags: ["pitch-deck", "startup", "design"],
    status: "pending", quality_tier: "Gold", ocr_flagged: false,
    created_at: new Date(NOW - 26 * 60 * MIN).toISOString(), updated_at: new Date(NOW - 26 * 60 * MIN).toISOString(),
  },
  {
    id: "dev-sub-005", provider_id: "dev-uid-002",
    title: "UI/UX redesign — mobile banking app",
    cover_image: MOCK_IMG.ux.cover,
    template_type: "case_study",
    blocks: [],
    category: "Digital & Creative Economy", tags: ["UI/UX", "mobile", "banking"],
    status: "pending", quality_tier: "Gold", ocr_flagged: false,
    created_at: new Date(NOW - 2 * 24 * 60 * MIN).toISOString(), updated_at: new Date(NOW - 2 * 24 * 60 * MIN).toISOString(),
  },
  {
    id: "dev-sub-006", provider_id: "dev-uid-003",
    title: "Motion graphics — brand intro reel",
    cover_image: MOCK_IMG.motion.cover,
    template_type: "video_showcase",
    blocks: [],
    category: "Video, Film & Entertainment", tags: ["motion", "animation", "brand"],
    status: "pending", quality_tier: "Silver", ocr_flagged: false,
    created_at: new Date(NOW - 5 * 24 * 60 * MIN).toISOString(), updated_at: new Date(NOW - 5 * 24 * 60 * MIN).toISOString(),
  },
];

const DEV_PROVIDERS: Map<string, Provider> = new Map([
  ["dev-uid-001", { id: "dev-uid-001", uid: "dev-uid-001", first_name: "Dara", last_name: "Okunade", name: "Dara Okunade", phone: "+2348012345678", category: "Branding, Design & Identity", subcategories: [], skills: ["Logo Design", "Brand Identity Systems"], quality_tier: "Gold", availability: "available", onboarding_complete: true, created_at: "", updated_at: "" }],
  ["dev-uid-002", { id: "dev-uid-002", uid: "dev-uid-002", first_name: "Emeka", last_name: "Okafor", name: "Emeka Okafor", phone: "+2348023456789", category: "Digital Marketing & E-Commerce", subcategories: [], skills: ["Social Media Management"], quality_tier: "Silver", availability: "available", onboarding_complete: true, created_at: "", updated_at: "" }],
  ["dev-uid-003", { id: "dev-uid-003", uid: "dev-uid-003", first_name: "Bola", last_name: "Adeyemi", name: "Bola Adeyemi", phone: "+2348034567890", category: "Video, Film & Entertainment", subcategories: [], skills: ["Video Editing (YouTube, TikTok)"], quality_tier: "Bronze", availability: "available", onboarding_complete: true, created_at: "", updated_at: "" }],
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toMillis(v: unknown): number {
  if (!v) return 0;
  if (typeof v === "string") return new Date(v).getTime() || 0;
  // Firestore Timestamp
  if (typeof v === "object" && v !== null && "seconds" in v) {
    return (v as { seconds: number }).seconds * 1000;
  }
  return 0;
}

function formatDateTime(v: unknown): string {
  const ms = toMillis(v);
  if (!ms) return "—";
  const d = new Date(ms);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

const TEMPLATE_LABELS: Record<string, string> = {
  image_portfolio: "Portfolio",
  case_study:      "Case Study",
  video_showcase:  "Video",
};

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

  // Newest first — robust to string or Firestore Timestamp created_at.
  const sorted = [...items].sort((a, b) => toMillis(b.created_at) - toMillis(a.created_at));

  return (
    <>
      <AdminHeader
        title="Pending Submissions"
        subtitle={`${items.length} item${items.length !== 1 ? "s" : ""} awaiting review`}
      />
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        {sorted.length === 0 ? (
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
          <div className="max-w-5xl mx-auto rounded-2xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
            {sorted.map((item) => (
              <SubmissionRow key={item.id} item={item} provider={providers.get(item.provider_id)} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

// ─── List row ──────────────────────────────────────────────────────────────────

function SubmissionRow({ item, provider }: { item: PortfolioItem; provider?: Provider }) {
  const initials = provider?.name
    ?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  return (
    <Link href={`/admin/submissions/${item.id}`}
      className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group">

      {/* Thumbnail */}
      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.cover_image}
          alt={item.title}
          className="w-full h-full object-cover"
        />
        {item.ocr_flagged && (
          <div className="absolute top-1 right-1 bg-red-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm">
            OCR
          </div>
        )}
      </div>

      {/* Title + provider */}
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-semibold text-gray-900 text-[14px] leading-snug truncate">
          {item.title}
        </h3>
        <div className="flex items-center gap-2 mt-1 min-w-0">
          <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-600 flex-shrink-0">
            {initials}
          </div>
          <span className="text-[12px] text-gray-500 truncate">
            {provider?.name ?? "Unknown"} · {item.category.split(",")[0].trim()}
          </span>
        </div>
      </div>

      {/* Template type — hidden on small screens */}
      <span className="hidden md:inline-flex text-[11px] text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full flex-shrink-0">
        {TEMPLATE_LABELS[item.template_type] ?? item.template_type}
      </span>

      {/* Date / time */}
      <span className="hidden sm:block text-[12px] text-gray-400 tabular-nums whitespace-nowrap flex-shrink-0 w-28 text-right">
        {formatDateTime(item.created_at)}
      </span>

      {/* Chevron */}
      <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0"
        fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
