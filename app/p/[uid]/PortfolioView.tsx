"use client";

import { useState } from "react";
import type { ContentBlock, PortfolioItem, QualityTier } from "@/lib/types";
import { Logo } from "@/components/ui/Logo";
import { ImageBlockRenderer } from "@/components/ui/ImageBlockRenderer";

const WA_NUMBER = process.env.NEXT_PUBLIC_PLUGIN_WA_NUMBER ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicProvider {
  displayName: string;
  category: string;
  bio: string;
  quality_tier: QualityTier;
  skills: string[];
}

interface Props {
  provider: PublicProvider;
  items: PortfolioItem[];
}

// ─── Tier config ──────────────────────────────────────────────────────────────

const TIER: Record<QualityTier, { icon: string; color: string; bg: string }> = {
  Gold:   { icon: "★", color: "text-amber-600",  bg: "bg-amber-50  border-amber-200"  },
  Silver: { icon: "◆", color: "text-gray-500",   bg: "bg-gray-100  border-gray-200"   },
  Bronze: { icon: "●", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
};

// ─── WhatsApp CTA ─────────────────────────────────────────────────────────────

function WaButton({ providerName, full = false }: { providerName: string; full?: boolean }) {
  const firstName = providerName.split(" ")[0];

  if (!WA_NUMBER) {
    return (
      <button disabled
        className={`inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-400 text-sm font-semibold rounded-2xl px-5 py-3 cursor-not-allowed ${full ? "w-full" : ""}`}>
        <WhatsAppIcon />
        Work with {firstName} — coming soon
      </button>
    );
  }

  const text = encodeURIComponent(
    `Hi Plugin! I just viewed ${providerName}'s portfolio and I'd like to work with them.`
  );

  return (
    <a
      href={`https://wa.me/${WA_NUMBER}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 bg-[#00EFFE] hover:bg-[#00D4E0] active:scale-[0.98] text-[#0A0A0A] text-sm font-semibold rounded-2xl px-5 py-3 transition-all ${full ? "w-full" : ""}`}>
      <WhatsAppIcon />
      Work with {firstName}
    </a>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ─── Portfolio item card ──────────────────────────────────────────────────────

function ItemCard({ item, onClick }: { item: PortfolioItem; onClick: () => void }) {
  const templateLabel: Record<string, string> = {
    image_portfolio: "Portfolio",
    case_study:      "Case Study",
    video_showcase:  "Video",
  };

  return (
    <button onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-gray-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-[0.99] group">
      {/* Cover */}
      <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative">
        {item.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cover_image} alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute top-2.5 left-2.5">
          <span className="text-[10px] font-semibold bg-black/40 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">
            {templateLabel[item.template_type] ?? item.template_type}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-2">{item.title}</p>
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Block renderers ──────────────────────────────────────────────────────────

export function BlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "text": {
      const s = block.style ?? {};
      return (
        <div className={`mx-auto ${s.width === 'narrow' ? 'max-w-2xl' : s.width === 'wide' ? 'max-w-4xl' : s.width === 'full' ? 'max-w-none' : ''}`}>
          {block.label && block.label !== "Story" && (
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{block.label}</p>
          )}
          <div className="[&>div]:m-0 [&>p]:m-0 [&>div]:leading-[1.75] [&>p]:leading-[1.75]"
             style={{ 
               fontFamily: s.fontFamily ? `'${s.fontFamily}', sans-serif` : 'inherit',
               fontSize: s.size === 'sm' ? '0.875rem' : s.size === 'lg' ? '1.125rem' : s.size === 'xl' ? '1.25rem' : s.size === '2xl' ? '1.5rem' : s.size === '3xl' ? '1.875rem' : '1rem',
               fontWeight: s.weight === 'bold' ? 700 : s.weight === 'semibold' ? 600 : s.weight === 'medium' ? 500 : 400,
               color: s.color ?? '#374151',
               lineHeight: 1.75,
             }}
             dangerouslySetInnerHTML={{ __html: block.content }}
          />
        </div>
      );
    }

    case "stat":
      return (
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-center">
          <p className="font-display font-bold text-2xl text-gray-900 mb-0.5">{block.value}</p>
          <p className="text-xs text-gray-500">{block.label}</p>
        </div>
      );

    case "images":
      return <ImageBlockRenderer block={block} />;

    case "video":
      if (!block.url) return null;
      return (
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Video</p>
          <div className="aspect-video rounded-xl overflow-hidden bg-gray-100">
            <iframe
              src={block.url.replace("watch?v=", "embed/")}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      );

  }
}

// ─── Item detail sheet ────────────────────────────────────────────────────────

function ItemSheet({ item, providerName, onClose }: {
  item: PortfolioItem;
  providerName: string;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl max-h-[90dvh] flex flex-col shadow-2xl animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 pb-6">
          {/* Cover */}
          {item.cover_image && (
            <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100 mb-5 mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.cover_image} alt={item.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Title + tags */}
          <h2 className="font-display font-bold text-gray-900 text-lg leading-snug mb-2">{item.title}</h2>
          {item.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {item.tags.map((t) => (
                <span key={t} className="text-xs bg-[#00EFFE]/10 text-[#0C5BEE] border border-[#00EFFE]/20 px-2.5 py-0.5 rounded-full font-medium">{t}</span>
              ))}
            </div>
          )}

          {/* Blocks */}
          {item.blocks?.length > 0 && (
            <div className="space-y-5">
              {item.blocks.map((block, i) => (
                <BlockRenderer key={i} block={block} />
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-7 pt-5 border-t border-gray-100">
            <WaButton providerName={providerName} full />
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function PortfolioView({ provider, items }: Props) {
  const [selected, setSelected] = useState<PortfolioItem | null>(null);
  const tier = TIER[provider.quality_tier];
  const initials = provider.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Lora:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 h-14 flex items-center justify-between">
        <Logo variant="full" height={20} />
        <WaButton providerName={provider.displayName} />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">

        {/* ── Provider hero ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 mb-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-[#00EFFE]/15 border-2 border-[#00EFFE]/30 flex items-center justify-center flex-shrink-0">
              <span className="font-display font-bold text-[#0C5BEE] text-lg">{initials}</span>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="font-display font-bold text-gray-900 text-xl leading-tight">{provider.displayName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm text-gray-500">{provider.category}</span>
                <span className="text-gray-300">·</span>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${tier.bg} ${tier.color}`}>
                  {tier.icon} {provider.quality_tier}
                </span>
              </div>
            </div>
          </div>

          {provider.bio && (
            <p className="text-sm text-gray-600 leading-relaxed mt-4 pt-4 border-t border-gray-100">
              {provider.bio}
            </p>
          )}

          {provider.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {provider.skills.map((s) => (
                <span key={s} className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">{s}</span>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100">
            <WaButton providerName={provider.displayName} full />
          </div>
        </div>

        {/* ── Portfolio grid ─────────────────────────────────────────────── */}
        <div className="mb-4">
          <h2 className="font-display font-semibold text-gray-900 text-base mb-0.5">Portfolio</h2>
          <p className="text-sm text-gray-400">{items.length} project{items.length !== 1 ? "s" : ""}</p>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <p className="text-gray-400 text-sm">No portfolio items yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} onClick={() => setSelected(item)} />
            ))}
          </div>
        )}
      </main>

      {/* ── Bottom sticky CTA ──────────────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-gray-200 px-4 py-3 z-30">
        <WaButton providerName={provider.displayName} full />
      </div>

      {/* ── Item detail sheet ──────────────────────────────────────────────── */}
      {selected && (
        <ItemSheet
          item={selected}
          providerName={provider.displayName}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
