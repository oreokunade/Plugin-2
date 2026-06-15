"use client";

import type { QualityTier } from "@/lib/types";

interface BadgeProps {
  tier: QualityTier;
  className?: string;
}

const TIER_STYLES: Record<QualityTier, { bg: string; text: string; icon: string }> = {
  Gold:   { bg: "bg-amber-50  border border-amber-200",  text: "text-amber-700",  icon: "★" },
  Silver: { bg: "bg-gray-100  border border-gray-200",   text: "text-gray-600",   icon: "◆" },
  Bronze: { bg: "bg-orange-50 border border-orange-200", text: "text-orange-700", icon: "●" },
};

export function TierBadge({ tier, className = "" }: BadgeProps) {
  const s = TIER_STYLES[tier];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text} ${className}`}>
      <span className="text-[10px]">{s.icon}</span>
      {tier}
    </span>
  );
}

interface TagProps {
  label: string;
  variant?: "cyan" | "blue" | "gray";
}

const TAG_STYLES = {
  cyan: "bg-[#00EFFE]/10 text-[#0C5BEE] border border-[#00EFFE]/25",
  blue: "bg-blue-50 text-blue-600 border border-blue-200",
  gray: "bg-gray-100 text-gray-600 border border-gray-200",
};

export function Tag({ label, variant = "gray" }: TagProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TAG_STYLES[variant]}`}>
      {label}
    </span>
  );
}
