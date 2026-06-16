import { adminDb, ADMIN_DEV_MODE } from "@/lib/firebase-admin";
import { AdminHeader } from "@/components/admin/Header";
import type { PortfolioItem, Provider } from "@/lib/types";
import Link from "next/link";

// ─── Dev mode mock data ───────────────────────────────────────────────────────

const DEV_ITEMS: PortfolioItem[] = [
  {
    id: "dev-sub-001", provider_id: "dev-uid-001",
    title: "Fintech rebrand — full brand identity",
    cover_image: "/mock/cover-fintech.svg", template_type: "before_after",
    blocks: [
      { type: "text",         label: "The Brief",  content: "Series A fintech startup needed a complete brand overhaul before their public launch." },
      { type: "text",         label: "The Result", content: "Full brand identity: logo, colours, and brand guidelines PDF." },
      { type: "before_after", before: ["/mock/before-1.svg", "/mock/before-2.svg"], after: ["/mock/after-1.svg", "/mock/after-2.svg"] },
    ],
    category: "Brand Identity", tags: ["rebrand", "fintech", "logo"],
    status: "pending", quality_tier: "Gold", ocr_flagged: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "dev-sub-002", provider_id: "dev-uid-002",
    title: "Social media kit — fashion brand",
    cover_image: "/mock/cover-fashion.svg", template_type: "image_portfolio",
    blocks: [{ type: "images", urls: ["/mock/social-1.svg", "/mock/social-2.svg", "/mock/social-3.svg", "/mock/social-4.svg"] }],
    category: "Social Media", tags: ["fashion", "instagram", "content"],
    status: "pending", quality_tier: "Silver", ocr_flagged: true,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "dev-sub-003", provider_id: "dev-uid-003",
    title: "E-commerce product video — 30s ad",
    cover_image: "/mock/cover-video.svg", template_type: "video_showcase",
    blocks: [
      { type: "video",  url: "https://youtu.be/dQw4w9WgXcQ" },
      { type: "images", urls: ["/mock/video-still-1.svg", "/mock/video-still-2.svg"] },
    ],
    category: "Video Production", tags: ["product", "ecommerce", "ad"],
    status: "pending", quality_tier: "Bronze", ocr_flagged: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
];

const DEV_PROVIDERS: Map<string, Provider> = new Map([
  ["dev-uid-001", { id: "dev-uid-001", uid: "dev-uid-001", first_name: "Dara",   last_name: "Okunade", name: "Dara Okunade", phone: "+2348012345678", category: "Branding, Design & Identity",   subcategories: ["Logo Design", "Brand Identity Systems"], skills: ["Logo Design", "Brand Identity Systems"], quality_tier: "Gold",   availability: "available", onboarding_complete: true, created_at: "", updated_at: "" }],
  ["dev-uid-002", { id: "dev-uid-002", uid: "dev-uid-002", first_name: "Emeka",  last_name: "Okafor",  name: "Emeka Okafor", phone: "+2348023456789", category: "Digital Marketing & E-Commerce",  subcategories: ["Social Media Management", "SEO & Google Ads"], skills: ["Social Media Management"], quality_tier: "Silver", availability: "available", onboarding_complete: true, created_at: "", updated_at: "" }],
  ["dev-uid-003", { id: "dev-uid-003", uid: "dev-uid-003", first_name: "Bola",   last_name: "Adeyemi", name: "Bola Adeyemi", phone: "+2348034567890", category: "Video, Film & Entertainment",     subcategories: ["Video Editing (YouTube, TikTok)", "Motion Graphics"], skills: ["Video Editing (YouTube, TikTok)"], quality_tier: "Bronze", availability: "available", onboarding_complete: true, created_at: "", updated_at: "" }],
]);

// ─── Data fetch ───────────────────────────────────────────────────────────────

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
    const providers   = new Map<string, Provider>();
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SubmissionsPage() {
  const { items, providers } = await getPendingSubmissions();

  return (
    <>
      <AdminHeader
        title="Pending Submissions"
        subtitle={`${items.length} item${items.length !== 1 ? "s" : ""} awaiting review`}
      />
      <main className="flex-1 p-8 overflow-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-[#00EFFE]/10 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#00EFFE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-display font-semibold text-gray-900 text-lg mb-2">All caught up!</h3>
            <p className="text-gray-500 text-[14px]">No pending submissions right now.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const provider = providers.get(item.provider_id);
              return <SubmissionCard key={item.id} item={item} provider={provider} />;
            })}
          </div>
        )}
      </main>
    </>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function SubmissionCard({ item, provider }: { item: PortfolioItem; provider?: Provider }) {
  const templateLabel = item.template_type?.replace(/_/g, " ") ?? "—";

  return (
    <div className="bg-white rounded-2xl shadow-[var(--card-shadow)] overflow-hidden hover:shadow-[var(--card-shadow-lg)] transition-all duration-200 group">
      {/* Cover */}
      <div className="h-44 bg-gray-100 overflow-hidden relative">
        {item.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {/* Tier badge */}
        <div className={`absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full ${
          item.quality_tier === "Gold"   ? "bg-amber-400/90 text-amber-900" :
          item.quality_tier === "Silver" ? "bg-gray-200/90 text-gray-700" :
          "bg-orange-200/90 text-orange-800"
        }`}>
          {item.quality_tier}
        </div>
        {/* OCR flag */}
        {item.ocr_flagged && (
          <div className="absolute top-3 right-3 bg-red-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Check
          </div>
        )}
      </div>

      <div className="p-5">
        {/* Title + status */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-display font-semibold text-gray-900 text-[15px] leading-snug line-clamp-2">{item.title}</h3>
          <span className="text-[11px] bg-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full flex-shrink-0 whitespace-nowrap">
            Pending
          </span>
        </div>

        {/* Category + template */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[13px] text-gray-500">{item.category}</span>
          <span className="text-gray-300">·</span>
          <span className="text-[12px] text-gray-400 capitalize">{templateLabel}</span>
        </div>

        {/* Provider info */}
        {provider && (
          <div className="flex items-center gap-2 mb-3.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <span className="text-[12px] text-amber-700 font-semibold">{provider.name}</span>
            <span className="text-amber-300">·</span>
            <span className="text-[12px] text-amber-600">{provider.phone}</span>
          </div>
        )}

        {/* Tags */}
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[11px] bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full font-medium">{t}</span>
            ))}
          </div>
        )}

        <Link
          href={`/admin/submissions/${item.id}`}
          className="w-full inline-flex items-center justify-center gap-2 bg-[#0A0A0A] hover:bg-gray-800 text-white text-[13.5px] font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          Review submission →
        </Link>
      </div>
    </div>
  );
}
