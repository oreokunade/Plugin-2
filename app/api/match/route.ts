import { NextRequest, NextResponse } from "next/server";
import { adminDb, ADMIN_DEV_MODE } from "@/lib/firebase-admin";
import { rankItems, rankProviders } from "@/lib/ranking";
import type { PortfolioItem, MatchRequest, Provider } from "@/lib/types";
import { MOCK_IMG } from "@/lib/mockImages";

// ─── Dev mode mock ────────────────────────────────────────────────────────────

const DEV_ITEMS: PortfolioItem[] = [
  {
    id: "dev-item-001", provider_id: "dev-uid-001",
    title: "Fintech rebrand — full brand identity",
    cover_image: MOCK_IMG.branding.cover, template_type: "case_study",
    blocks: [
      { type: "text", label: "The Brief",  content: "Series A fintech startup needed a complete brand overhaul." },
      { type: "text", label: "The Result", content: "Full brand identity: logo, colours, and brand guidelines PDF." },
      { type: "images", urls: [...MOCK_IMG.branding.samples] },
    ],
    category: "Branding, Design & Identity",
    tags: ["rebrand", "fintech", "logo", "brand identity"],
    status: "approved", quality_tier: "Gold", ocr_flagged: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "dev-item-002", provider_id: "dev-uid-002",
    title: "Social media kit — fashion brand",
    cover_image: MOCK_IMG.fashion.cover, template_type: "image_portfolio",
    blocks: [{ type: "images", urls: [...MOCK_IMG.fashion.posts] }],
    category: "Digital Marketing & E-Commerce",
    tags: ["fashion", "instagram", "content", "social media"],
    status: "approved", quality_tier: "Silver", ocr_flagged: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "dev-item-003", provider_id: "dev-uid-003",
    title: "E-commerce product video — 30s ad",
    cover_image: MOCK_IMG.video.cover, template_type: "video_showcase",
    blocks: [
      { type: "video",  url: "https://youtu.be/dQw4w9WgXcQ" },
      { type: "images", urls: MOCK_IMG.video.stills.slice(0, 2) },
    ],
    category: "Video, Film & Entertainment",
    tags: ["product", "ecommerce", "ad", "video"],
    status: "approved", quality_tier: "Bronze", ocr_flagged: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
];

const DEV_PROVIDERS: Record<string, Provider> = {
  "dev-uid-001": {
    id: "dev-uid-001", uid: "dev-uid-001",
    first_name: "Dara", last_name: "Okunade", name: "Dara Okunade",
    phone: "+2348012345678",
    category: "Branding, Design & Identity",
    subcategories: ["Logo Design", "Brand Identity Systems"],
    skills: ["Logo Design", "Brand Identity Systems"],
    quality_tier: "Gold", availability: "available",
    onboarding_complete: true, created_at: "", updated_at: "",
  },
  "dev-uid-002": {
    id: "dev-uid-002", uid: "dev-uid-002",
    first_name: "Emeka", last_name: "Okafor", name: "Emeka Okafor",
    phone: "+2348023456789",
    category: "Digital Marketing & E-Commerce",
    subcategories: ["Social Media Management"],
    skills: ["Social Media Management"],
    quality_tier: "Silver", availability: "available",
    onboarding_complete: true, created_at: "", updated_at: "",
  },
  "dev-uid-003": {
    id: "dev-uid-003", uid: "dev-uid-003",
    first_name: "Bola", last_name: "Adeyemi", name: "Bola Adeyemi",
    phone: "+2348034567890",
    category: "Video, Film & Entertainment",
    subcategories: ["Video Editing (YouTube, TikTok)"],
    skills: ["Video Editing (YouTube, TikTok)"],
    quality_tier: "Bronze", availability: "available",
    onboarding_complete: true, created_at: "", updated_at: "",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "First L." display format — safe for client-facing output */
function publicDisplayName(provider: Provider): string {
  const last = provider.last_name?.trim();
  return last
    ? `${provider.first_name} ${last[0].toUpperCase()}.`
    : provider.first_name;
}

function portfolioUrl(uid: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${base}/p/${uid}`;
}

// ─── POST /api/match ──────────────────────────────────────────────────────────

/**
 * Bot API — returns top N providers ranked for a given client request.
 * Requires `x-admin-secret` header.
 *
 * Body: { category: string, tags?: string[], limit?: number }
 *
 * Response:
 * {
 *   providers: [{
 *     display_name:  "Dara O.",
 *     quality_tier:  "Gold",
 *     score:         0.87,
 *     availability:  "available",
 *     portfolio_url: "https://plugin.com/p/dev-uid-001",
 *     preview_item:  { title, cover_image, tags }
 *   }]
 * }
 */
export async function POST(req: NextRequest) {
  // Auth
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let body: MatchRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { category, tags = [], limit = 3 } = body;

  if (!category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }

  // ── Dev mode ──────────────────────────────────────────────────────────────
  if (ADMIN_DEV_MODE) {
    const items  = DEV_ITEMS.filter((i) => i.category === category);
    const ranked = rankItems(items.length ? items : DEV_ITEMS, { category, tags });
    const providers = rankProviders(ranked).slice(0, limit);

    const result = providers.map((p) => {
      const prov = DEV_PROVIDERS[p.provider_id];
      return {
        display_name:  prov ? publicDisplayName(prov) : "Provider",
        quality_tier:  p.quality_tier,
        score:         Math.round(p.score * 100) / 100,
        availability:  prov?.availability ?? "unknown",
        portfolio_url: portfolioUrl(p.provider_id),
        preview_item: {
          title:       p.best_item.title,
          cover_image: p.best_item.cover_image,
          tags:        p.best_item.tags,
        },
      };
    });

    return NextResponse.json({ providers: result });
  }

  // ── Production ────────────────────────────────────────────────────────────
  try {
    const itemSnap = await adminDb
      .collection("portfolio_items")
      .where("category", "==", category)
      .where("status",   "==", "approved")
      .limit(100)
      .get();

    const items = itemSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as PortfolioItem[];

    if (items.length === 0) {
      return NextResponse.json({ providers: [] });
    }

    const ranked    = rankItems(items, { category, tags });
    const topProviders = rankProviders(ranked).slice(0, limit);

    // Batch-fetch provider docs
    const providerDocs = await Promise.all(
      topProviders.map((p) => adminDb.collection("providers").doc(p.provider_id).get())
    );

    const result = topProviders.map((p, i) => {
      const prov = providerDocs[i].exists
        ? ({ id: providerDocs[i].id, ...providerDocs[i].data() } as Provider)
        : undefined;

      return {
        display_name:  prov ? publicDisplayName(prov) : "Provider",
        quality_tier:  p.quality_tier,
        score:         Math.round(p.score * 100) / 100,
        availability:  prov?.availability ?? "unknown",
        portfolio_url: portfolioUrl(p.provider_id),
        preview_item: {
          title:       p.best_item.title,
          cover_image: p.best_item.cover_image,
          tags:        p.best_item.tags,
        },
      };
    });

    return NextResponse.json({ providers: result });
  } catch (err) {
    console.error("[/api/match]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
