"use client";

import Image from "next/image";
import type { PublicStyleCard } from "@/lib/types";

interface StyleCardProps {
  card: PublicStyleCard;
  selected?: boolean;
  onSelect: (id: string) => void;
}

export function StyleCard({ card, selected, onSelect }: StyleCardProps) {
  const hasImages = card.sample_items.some((item) => item.cover_image);

  return (
    <button
      onClick={() => onSelect(card.id)}
      className={`
        w-full text-left rounded-[16px] overflow-hidden border-2 transition-all duration-200
        hover:shadow-lg hover:-translate-y-0.5 cursor-pointer
        ${selected
          ? "border-cyan shadow-md shadow-cyan/20"
          : "border-gray-200 hover:border-cyan/40"
        }
      `}
    >
      {/* Image grid */}
      <div className="grid grid-cols-3 gap-0.5 bg-gray-100 aspect-video">
        {Array.from({ length: 3 }).map((_, i) => {
          const item = card.sample_items[i];
          const url = item?.cover_image;
          return (
            <div key={i} className="relative bg-gray-200 overflow-hidden">
              {url ? (
                <Image
                  src={url}
                  alt="Portfolio sample"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 33vw, 20vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className={`p-4 ${selected ? "bg-cyan/5" : "bg-white"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display font-600 text-near-black text-sm">{card.style_label}</p>
            <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{card.description}</p>
          </div>
          {selected && (
            <div className="w-5 h-5 rounded-full bg-cyan flex items-center justify-center flex-shrink-0 ml-3">
              <svg className="w-3 h-3 text-near-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
