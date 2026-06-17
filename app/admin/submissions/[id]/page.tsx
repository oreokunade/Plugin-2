import { adminDb, ADMIN_DEV_MODE } from "@/lib/firebase-admin";
import type { PortfolioItem, Provider, ContentBlock, TemplateType } from "@/lib/types";
import { notFound } from "next/navigation";
import { CATEGORY_MAP, TEMPLATES } from "@/lib/templates";
import Link from "next/link";
import ReviewActions from "./ReviewActions";

// ─── Dev mock data ─────────────────────────────────────────────────────────────

const DEV_SUBMISSIONS: Record<string, { item: PortfolioItem; provider: Provider }> = {
  "dev-sub-001": {
    item: {
      id: "dev-sub-001", provider_id: "dev-uid-001",
      title: "Fintech rebrand — full brand identity",
      cover_image: "https://picsum.photos/seed/fintech1/1200/800", template_type: "before_after",
      blocks: [
        { type: "before_after", before: ["https://picsum.photos/seed/before1a/600/600", "https://picsum.photos/seed/before1b/600/600"], after: ["https://picsum.photos/seed/after1a/600/600", "https://picsum.photos/seed/after1b/600/600"] },
        { type: "text", label: "What changed", content: "Redesigned the entire brand from a cluttered 2019 identity to a clean, modern system with new logo, colour palette, and typography." },
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
      cover_image: "https://picsum.photos/seed/fashion2/1200/800", template_type: "case_study",
      blocks: [
        { type: "text", label: "The Brief",    content: "A Lagos fashion label needed a consistent social media presence for their Spring/Summer campaign." },
        { type: "text", label: "The Approach", content: "Developed a 30-piece content calendar, designed templates in Canva Pro, and shot 12 original flat-lay product photos." },
        { type: "text", label: "The Result",   content: "Delivered a full social media kit: 30 designed posts, 5 story templates, and brand content guidelines." },
        { type: "images", urls: ["https://picsum.photos/seed/soc1/600/600", "https://picsum.photos/seed/soc2/600/600", "https://picsum.photos/seed/soc3/600/600", "https://picsum.photos/seed/soc4/600/600"] },
        { type: "stat", label: "Outcome", value: "Engagement up 340% in the first month after campaign launch" },
      ],
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
      cover_image: "https://picsum.photos/seed/product3/1200/800", template_type: "video_showcase",
      blocks: [
        { type: "video", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
        { type: "text", label: "About this project", content: "30-second product ad for a Lagos fashion e-commerce brand launching their Harmattan collection on Instagram and TikTok." },
        { type: "images", urls: ["https://picsum.photos/seed/still1/600/400", "https://picsum.photos/seed/still2/600/400", "https://picsum.photos/seed/still3/600/400"] },
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

// ─── Data fetch ────────────────────────────────────────────────────────────────

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

const CATEGORIES = CATEGORY_MAP.map((c) => c.label);

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getSubmission(id);
  if (!data) notFound();
  const { item, provider } = data;

  const templateLabel = TEMPLATES[item.template_type]?.label ?? item.template_type;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3 flex-shrink-0">
        <Link href="/admin/submissions"
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 -ml-1">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display font-bold text-gray-900 text-[15px] sm:text-[17px] leading-tight truncate">
            {item.title}
          </h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] text-gray-400">{item.category}</span>
            <span className="text-gray-200">·</span>
            <span className="text-[11px] text-gray-400">{templateLabel}</span>
            {item.ocr_flagged && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                OCR flag
              </span>
            )}
          </div>
        </div>
        {/* Status chip */}
        <span className={`flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${
          item.status === "approved" ? "bg-emerald-100 text-emerald-700"
          : item.status === "rejected" ? "bg-red-100 text-red-700"
          : "bg-amber-100 text-amber-700"
        }`}>{item.status}</span>
      </div>

      {/* Two-column layout: content | review panel */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:grid lg:grid-cols-[1fr_340px] lg:gap-8 lg:items-start">

          {/* ── LEFT: Template-aware content ─────────────────────────────── */}
          <div className="space-y-6 mb-8 lg:mb-0">
            <TemplateContent item={item} />
          </div>

          {/* ── RIGHT: Review panel ───────────────────────────────────────── */}
          <div className="space-y-4 lg:sticky lg:top-6">

            {/* Provider — internal only */}
            {provider && (
              <div className="border border-amber-200 bg-amber-50 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-3">
                  Provider — internal only
                </p>
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    <InfoRow label="Name"   value={provider.name} />
                    <InfoRow label="Phone"  value={provider.phone} />
                    <InfoRow label="Tier"   value={provider.quality_tier} />
                    <InfoRow label="Status" value={provider.availability} />
                  </div>
                  <InfoRow label="Category" value={provider.category} />
                  {provider.skills?.length > 0 && (
                    <div>
                      <p className="text-[11px] text-amber-500 font-medium mb-1.5">Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {provider.skills.map((s) => (
                          <span key={s} className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submission meta */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Submission Details
              </p>
              <div className="space-y-3">
                <MetaRow label="Title"    value={item.title} />
                <MetaRow label="Category" value={item.category} />
                <MetaRow label="Template" value={templateLabel} />
                <MetaRow label="Tags"     value={item.tags?.join(", ") || "—"} />
              </div>
            </div>

            {/* Review & Tag form */}
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
      </div>
    </div>
  );
}

// ─── Template-aware content renderer ──────────────────────────────────────────

function TemplateContent({ item }: { item: PortfolioItem }) {
  switch (item.template_type as TemplateType) {
    case "before_after":
      return <BeforeAfterView item={item} />;
    case "case_study":
      return <CaseStudyView item={item} />;
    case "video_showcase":
      return <VideoShowcaseView item={item} />;
    case "image_portfolio":
    default:
      return <ImagePortfolioView item={item} />;
  }
}

// ─── Before & After ───────────────────────────────────────────────────────────

function BeforeAfterView({ item }: { item: PortfolioItem }) {
  const baBlock = item.blocks.find((b): b is Extract<ContentBlock, { type: "before_after" }> => b.type === "before_after");
  const descBlock = item.blocks.find((b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text");

  return (
    <div className="space-y-5">
      <SectionLabel icon="↔" label="Before & After" />

      {baBlock ? (
        <div className="grid grid-cols-2 gap-3">
          {/* Before */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Before</span>
            </div>
            {baBlock.before.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden hover:opacity-90 transition-opacity">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Before ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              </a>
            ))}
          </div>
          {/* After */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00EFFE]" />
              <span className="text-[11px] font-bold text-[#00EFFE] uppercase tracking-wider">After</span>
            </div>
            {baBlock.after.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden hover:opacity-90 transition-opacity">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`After ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : (
        <CoverImage url={item.cover_image} />
      )}

      {descBlock && (
        <TextBlock label={descBlock.label} content={descBlock.content} />
      )}
    </div>
  );
}

// ─── Case Study ───────────────────────────────────────────────────────────────

function CaseStudyView({ item }: { item: PortfolioItem }) {
  const textBlocks = item.blocks.filter((b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text");
  const imageBlock = item.blocks.find((b): b is Extract<ContentBlock, { type: "images" }> => b.type === "images");
  const statBlock  = item.blocks.find((b): b is Extract<ContentBlock, { type: "stat" }> => b.type === "stat");

  return (
    <div className="space-y-5">
      <SectionLabel icon="📄" label="Case Study" />
      <CoverImage url={item.cover_image} />

      {/* Text sections: brief, approach, result */}
      {textBlocks.length > 0 && (
        <div className="space-y-3">
          {textBlocks.map((b, i) => (
            <TextBlock key={i} label={b.label} content={b.content} />
          ))}
        </div>
      )}

      {/* Work samples */}
      {imageBlock && imageBlock.urls.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Work Samples</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {imageBlock.urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden hover:opacity-90 transition-opacity">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Outcome stat */}
      {statBlock && (
        <div className="bg-[#00EFFE]/8 border border-[#00EFFE]/20 rounded-2xl px-5 py-4">
          <p className="text-[11px] font-semibold text-[#00EFFE] uppercase tracking-wider mb-1">
            {statBlock.label}
          </p>
          <p className="text-[15px] font-semibold text-gray-800">{statBlock.value}</p>
        </div>
      )}
    </div>
  );
}

// ─── Video Showcase ───────────────────────────────────────────────────────────

function VideoShowcaseView({ item }: { item: PortfolioItem }) {
  const videoBlock  = item.blocks.find((b): b is Extract<ContentBlock, { type: "video" }> => b.type === "video");
  const descBlock   = item.blocks.find((b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text");
  const stillsBlock = item.blocks.find((b): b is Extract<ContentBlock, { type: "images" }> => b.type === "images");

  const getEmbedUrl = (url: string) => {
    // Convert youtu.be and watch?v= links to embed format
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    return url;
  };

  return (
    <div className="space-y-5">
      <SectionLabel icon="🎬" label="Video Showcase" />

      {videoBlock ? (
        <div className="aspect-video bg-gray-900 rounded-2xl overflow-hidden">
          <iframe
            src={getEmbedUrl(videoBlock.url)}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video submission"
          />
        </div>
      ) : (
        <CoverImage url={item.cover_image} />
      )}

      {descBlock && <TextBlock label={descBlock.label} content={descBlock.content} />}

      {stillsBlock && stillsBlock.urls.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Behind-the-scenes / Stills</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {stillsBlock.urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden hover:opacity-90 transition-opacity">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Image Portfolio ──────────────────────────────────────────────────────────

function ImagePortfolioView({ item }: { item: PortfolioItem }) {
  const galleryBlock = item.blocks.find((b): b is Extract<ContentBlock, { type: "images" }> => b.type === "images");
  const descBlock    = item.blocks.find((b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text");
  const allImages    = galleryBlock?.urls ?? [];

  return (
    <div className="space-y-5">
      <SectionLabel icon="🖼" label="Image Portfolio" />
      <CoverImage url={item.cover_image} />

      {allImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {allImages.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noreferrer">
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden hover:opacity-90 transition-opacity">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            </a>
          ))}
        </div>
      )}

      {descBlock && <TextBlock label={descBlock.label} content={descBlock.content} />}
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base">{icon}</span>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
    </div>
  );
}

function CoverImage({ url }: { url?: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden hover:opacity-90 transition-opacity">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Cover" className="w-full h-full object-cover" />
      </div>
    </a>
  );
}

function TextBlock({ label, content }: { label: string; content: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-[14px] text-gray-700 leading-relaxed">{content}</p>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-[12px] text-gray-400 font-medium flex-shrink-0">{label}</p>
      <p className="text-[13px] text-gray-800 font-medium text-right">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-amber-500 font-medium">{label}</p>
      <p className="text-[13px] text-gray-800 font-medium">{value}</p>
    </div>
  );
}
