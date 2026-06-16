import { adminDb, ADMIN_DEV_MODE } from "@/lib/firebase-admin";
import { AdminHeader } from "@/components/admin/Header";
import type { PortfolioItem, Provider } from "@/lib/types";
import { notFound } from "next/navigation";
import { CATEGORY_MAP } from "@/lib/templates";
import ReviewActions from "./ReviewActions";

// ─── Dev mock data ────────────────────────────────────────────────────────────

const DEV_SUBMISSIONS: Record<string, { item: PortfolioItem; provider: Provider }> = {
  "dev-sub-001": {
    item: {
      id: "dev-sub-001", provider_id: "dev-uid-001",
      title: "Fintech rebrand — full brand identity",
      cover_image: "/mock/cover-fintech.svg", template_type: "before_after",
      blocks: [
        { type: "text",         label: "The Brief",  content: "Series A fintech startup needed a complete brand overhaul before their public launch." },
        { type: "text",         label: "The Result", content: "Full brand identity: logo, colours, and brand guidelines PDF." },
        { type: "before_after", before: ["/mock/before-1.svg", "/mock/before-2.svg"], after: ["/mock/after-1.svg", "/mock/after-2.svg"] },
      ],
      category: "Branding, Design & Identity", tags: ["rebrand", "fintech", "logo"],
      status: "pending", quality_tier: "Gold", ocr_flagged: false,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
    provider: {
      id: "dev-uid-001", uid: "dev-uid-001",
      first_name: "Dara", last_name: "Okunade", name: "Dara Okunade",
      phone: "+2348012345678", category: "Branding, Design & Identity",
      subcategories: ["Logo Design", "Brand Identity Systems"],
      skills: ["Logo Design", "Brand Identity Systems"],
      quality_tier: "Gold", availability: "available",
      onboarding_complete: true, created_at: "", updated_at: "",
    },
  },
  "dev-sub-002": {
    item: {
      id: "dev-sub-002", provider_id: "dev-uid-002",
      title: "Social media kit — fashion brand",
      cover_image: "/mock/cover-fashion.svg", template_type: "image_portfolio",
      blocks: [{ type: "images", urls: ["/mock/social-1.svg", "/mock/social-2.svg", "/mock/social-3.svg", "/mock/social-4.svg"] }],
      category: "Digital Marketing & E-Commerce", tags: ["fashion", "instagram", "content"],
      status: "pending", quality_tier: "Silver", ocr_flagged: true,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
    provider: {
      id: "dev-uid-002", uid: "dev-uid-002",
      first_name: "Emeka", last_name: "Okafor", name: "Emeka Okafor",
      phone: "+2348023456789", category: "Digital Marketing & E-Commerce",
      subcategories: ["Social Media Management"],
      skills: ["Social Media Management"],
      quality_tier: "Silver", availability: "available",
      onboarding_complete: true, created_at: "", updated_at: "",
    },
  },
  "dev-sub-003": {
    item: {
      id: "dev-sub-003", provider_id: "dev-uid-003",
      title: "E-commerce product video — 30s ad",
      cover_image: "/mock/cover-video.svg", template_type: "video_showcase",
      blocks: [
        { type: "video",  url: "https://youtu.be/dQw4w9WgXcQ" },
        { type: "images", urls: ["/mock/video-still-1.svg", "/mock/video-still-2.svg"] },
      ],
      category: "Video, Film & Entertainment", tags: ["product", "ecommerce", "ad"],
      status: "pending", quality_tier: "Bronze", ocr_flagged: false,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
    provider: {
      id: "dev-uid-003", uid: "dev-uid-003",
      first_name: "Bola", last_name: "Adeyemi", name: "Bola Adeyemi",
      phone: "+2348034567890", category: "Video, Film & Entertainment",
      subcategories: ["Video Editing (YouTube, TikTok)"],
      skills: ["Video Editing (YouTube, TikTok)"],
      quality_tier: "Bronze", availability: "available",
      onboarding_complete: true, created_at: "", updated_at: "",
    },
  },
};

// ─── Data fetch ───────────────────────────────────────────────────────────────

async function getSubmission(id: string) {
  if (ADMIN_DEV_MODE) return DEV_SUBMISSIONS[id] ?? null;

  try {
    const itemDoc = await adminDb.collection("portfolio_items").doc(id).get();
    if (!itemDoc.exists) return null;
    const item = { id: itemDoc.id, ...itemDoc.data() } as PortfolioItem;
    const provDoc = await adminDb.collection("providers").doc(item.provider_id).get();
    const provider = provDoc.exists ? ({ id: provDoc.id, ...provDoc.data() } as Provider) : null;
    return { item, provider };
  } catch {
    return null;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const CATEGORIES = CATEGORY_MAP.map((c) => c.label);

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getSubmission(id);
  if (!data) notFound();
  const { item, provider } = data;

  return (
    <>
      <AdminHeader title="Review Submission" subtitle={item.title} />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-5xl grid md:grid-cols-2 gap-8">

          {/* Left — media + provider info */}
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-gray-800 text-sm">Media</h3>

            {item.cover_image ? (
              <div className="grid grid-cols-2 gap-2">
                {/* Cover */}
                <a href={item.cover_image} target="_blank" rel="noreferrer"
                  className="col-span-2 block">
                  <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden hover:opacity-90 transition-opacity">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.cover_image} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                </a>
                {/* Inline images from blocks */}
                {item.blocks
                  .flatMap((b) =>
                    b.type === "images"       ? b.urls :
                    b.type === "before_after" ? [...b.before, ...b.after] :
                    []
                  )
                  .slice(0, 4)
                  .map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                      <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden hover:opacity-90 transition-opacity">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    </a>
                  ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400 text-sm">
                No media uploaded
              </div>
            )}

            {/* OCR flag */}
            {item.ocr_flagged && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-xs font-semibold text-red-700">OCR flag — check for contact info</p>
                  <p className="text-xs text-red-500 mt-0.5">Images may contain visible phone numbers, handles, or watermarks.</p>
                </div>
              </div>
            )}

            {/* Provider info — internal only */}
            {provider && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2.5">
                  Provider — internal only
                </p>
                <div className="space-y-1.5 text-sm">
                  <Row label="Name"     value={provider.name} />
                  <Row label="Phone"    value={provider.phone} />
                  <Row label="Category" value={provider.category} />
                  <Row label="Skills"   value={provider.skills?.join(", ") || "—"} />
                  <Row label="Tier"     value={provider.quality_tier} />
                </div>
              </div>
            )}
          </div>

          {/* Right — details + review form */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-display font-semibold text-gray-800 text-[15px]">Submission Details</h3>
              <Info label="Title"    value={item.title} />
              <Info label="Category" value={item.category} />
              <Info label="Template" value={item.template_type?.replace(/_/g, " ")} />
              <Info label="Tags"     value={item.tags?.join(", ") || "—"} />
              <Info label="Status"   value={
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                  item.status === "approved" ? "bg-emerald-100 text-emerald-700"
                  : item.status === "rejected" ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700"
                }`}>{item.status}</span>
              } />
            </div>

            <ReviewActions
              id={item.id}
              currentStatus={item.status}
              currentCategory={item.category}
              currentQualityTier={item.quality_tier}
              currentTags={item.tags ?? []}
              categories={CATEGORIES}
            />
          </div>
        </div>
      </main>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <div className="text-[14px] text-gray-800">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[13.5px]">
      <span className="text-amber-600 font-medium">{label}:</span>{" "}
      <span className="text-gray-800">{value}</span>
    </p>
  );
}
