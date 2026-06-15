import { adminDb, ADMIN_DEV_MODE } from "@/lib/firebase-admin";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { PortfolioItem, QualityTier } from "@/lib/types";
import PortfolioView from "./PortfolioView";

// ─── Public-safe provider shape ───────────────────────────────────────────────
// Phone, UID (beyond URL), admin notes — never exposed

interface PublicProvider {
  displayName: string;
  category: string;
  bio: string;
  quality_tier: QualityTier;
  skills: string[];
}

// ─── Dev mock data ────────────────────────────────────────────────────────────

const DEV_PROVIDER: PublicProvider = {
  displayName: "Dara O.",
  category: "Brand Identity",
  bio: "5 years building brands for Nigerian startups. I specialise in logo design, brand guidelines, and visual identity systems that make companies stand out.",
  quality_tier: "Gold",
  skills: ["Logo Design", "Brand Guidelines", "Typography", "Visual Identity"],
};

const DEV_ITEMS: PortfolioItem[] = [
  {
    id: "dev-p-001",
    provider_id: "dev-uid-001",
    title: "Fintech startup rebrand — full visual identity",
    cover_image: "/mock/cover-fintech.svg",
    template_type: "before_after",
    blocks: [
      { type: "text",         label: "The Brief",     content: "Series A fintech needed a complete brand overhaul before their public launch. Old brand felt dated and corporate." },
      { type: "text",         label: "The Result",    content: "New identity: custom logotype, colour system, iconography, and a 40-page brand guidelines document." },
      { type: "before_after", before: ["/mock/before-1.svg", "/mock/before-2.svg"], after: ["/mock/after-1.svg", "/mock/after-2.svg"] },
      { type: "stat",         label: "Turnaround",    value: "3 weeks" },
      { type: "stat",         label: "Deliverables",  value: "12 assets" },
    ],
    category: "Brand Identity",
    tags: ["rebrand", "fintech", "logo", "guidelines"],
    status: "approved",
    quality_tier: "Gold",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "dev-p-002",
    provider_id: "dev-uid-001",
    title: "Social media kit — fashion brand",
    cover_image: "/mock/cover-fashion.svg",
    template_type: "image_portfolio",
    blocks: [
      { type: "text",   label: "Project", content: "Full social media content kit for an Abuja-based fashion label — 30 posts, 4 story templates, and a carousel series." },
      { type: "images", urls: ["/mock/social-1.svg", "/mock/social-2.svg", "/mock/social-3.svg", "/mock/social-4.svg"], caption: "Sample posts from the kit" },
      { type: "stat",   label: "Posts delivered", value: "30" },
      { type: "stat",   label: "Avg engagement",  value: "+340%" },
    ],
    category: "Social Media",
    tags: ["fashion", "instagram", "content", "social"],
    status: "approved",
    quality_tier: "Gold",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "dev-p-003",
    provider_id: "dev-uid-001",
    title: "E-commerce product video — 30s ad",
    cover_image: "/mock/cover-video.svg",
    template_type: "video_showcase",
    blocks: [
      { type: "text",   label: "About this project", content: "30-second product launch ad for a Lagos-based e-commerce brand. Shot, edited, and colour-graded in 4K." },
      { type: "video",  url: "https://youtu.be/dQw4w9WgXcQ" },
      { type: "images", urls: ["/mock/video-still-1.svg", "/mock/video-still-2.svg"], caption: "Behind the scenes & storyboard" },
      { type: "stat",   label: "Duration",   value: "0:30" },
      { type: "stat",   label: "Resolution", value: "4K 60fps" },
    ],
    category: "Video Production",
    tags: ["product", "ecommerce", "ad", "video"],
    status: "approved",
    quality_tier: "Silver",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ─── Data fetch ───────────────────────────────────────────────────────────────

async function getPortfolioData(uid: string): Promise<{
  provider: PublicProvider;
  items: PortfolioItem[];
} | null> {
  if (ADMIN_DEV_MODE) {
    if (uid !== "dev-uid-001") return null;
    return { provider: DEV_PROVIDER, items: DEV_ITEMS };
  }

  try {
    const provSnap = await adminDb.collection("providers").doc(uid).get();
    if (!provSnap.exists) return null;

    const pData = provSnap.data()!;
    if (!pData.onboarding_complete) return null;

    // Sanitise name → first name + last initial only
    const nameParts = (pData.name as string).trim().split(/\s+/);
    const displayName =
      nameParts.length > 1
        ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
        : nameParts[0];

    const provider: PublicProvider = {
      displayName,
      category:      pData.category ?? "",
      bio:           pData.bio ?? "",
      quality_tier:  pData.quality_tier ?? "Bronze",
      skills:        pData.skills ?? [],
    };

    const itemsSnap = await adminDb
      .collection("portfolio_items")
      .where("provider_id", "==", uid)
      .where("status", "==", "approved")
      .orderBy("updated_at", "desc")
      .get();

    const items = itemsSnap.docs.map((d) => {
      const data = d.data();
      // Strip internal fields — never expose provider_id, phone, admin_notes, ocr_flagged
      return {
        id:            d.id,
        provider_id:   "",         // intentionally blank on public side
        title:         data.title,
        cover_image:   data.cover_image ?? "",
        template_type: data.template_type,
        blocks:        data.blocks ?? [],
        category:      data.category,
        tags:          data.tags ?? [],
        status:        "approved" as const,
        quality_tier:  data.quality_tier,
        created_at:    data.created_at ?? "",
        updated_at:    data.updated_at ?? "",
      } satisfies PortfolioItem;
    });

    return { provider, items };
  } catch {
    return null;
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ uid: string }>;
}): Promise<Metadata> {
  const { uid } = await params;
  const data = await getPortfolioData(uid);
  if (!data) return { title: "Portfolio — Plugin" };

  const { provider } = data;
  return {
    title:       `${provider.displayName} · ${provider.category} — Plugin`,
    description: provider.bio || `View ${provider.displayName}'s portfolio on Plugin`,
    openGraph: {
      title:       `${provider.displayName} · ${provider.category}`,
      description: provider.bio || `View ${provider.displayName}'s creative work on Plugin`,
      siteName:    "Plugin",
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  const data = await getPortfolioData(uid);
  if (!data) notFound();

  return <PortfolioView provider={data.provider} items={data.items} />;
}
