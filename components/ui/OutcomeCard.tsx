"use client";

import type { PublicOutcomeCard } from "@/lib/types";
import { Tag } from "./Badge";

interface OutcomeCardProps {
  card: PublicOutcomeCard;
  selected?: boolean;
  onSelect: (id: string) => void;
}

export function OutcomeCard({ card, selected, onSelect }: OutcomeCardProps) {
  return (
    <button
      onClick={() => onSelect(card.id)}
      className={`
        w-full text-left rounded-[16px] p-6 border-2 transition-all duration-200
        hover:shadow-lg hover:-translate-y-0.5 cursor-pointer
        ${selected
          ? "border-cyan bg-cyan/5 shadow-md shadow-cyan/20"
          : "border-gray-200 bg-white hover:border-cyan/40"
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            selected ? "bg-cyan text-near-black" : "bg-gray-100 text-gray-500"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        {selected && (
          <span className="text-xs font-semibold text-cyan bg-cyan/10 px-2.5 py-1 rounded-full">
            Selected
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-display text-lg font-700 text-near-black mb-2 leading-snug">
        {card.title}
      </h3>

      {/* Description */}
      <p className="text-gray-500 text-sm leading-relaxed mb-4">
        {card.description}
      </p>

      {/* Example outputs */}
      {card.example_outputs.length > 0 && (
        <div className="space-y-1.5">
          {card.example_outputs.slice(0, 3).map((ex, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan flex-shrink-0" />
              {ex}
            </div>
          ))}
        </div>
      )}

      {/* Sample tags */}
      {card.sample_items.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            {card.sample_items.slice(0, 3).flatMap((item) =>
              item.tags.slice(0, 1).map((tag) => (
                <Tag key={`${item.id}-${tag}`} label={tag} variant="cyan" />
              ))
            )}
          </div>
        </div>
      )}
    </button>
  );
}
