"use client";

import type { QualityTier } from "@/lib/types";

// ─── Tier Badge ───────────────────────────────────────────────────────────────

interface TierBadgeProps {
  tier: QualityTier;
  className?: string;
}

const TIER_CONFIG: Record<QualityTier, { bg: string; text: string; border: string; dot: string }> = {
  Gold:   { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  dot: "bg-amber-400" },
  Silver: { bg: "bg-slate-100", text: "text-slate-600",  border: "border-slate-200",  dot: "bg-slate-400" },
  Bronze: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-400" },
};

export function TierBadge({ tier, className = "" }: TierBadgeProps) {
  const c = TIER_CONFIG[tier];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${c.bg} ${c.text} ${c.border} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
      {tier}
    </span>
  );
}

// ─── Availability Badge ───────────────────────────────────────────────────────

type Availability = "available" | "busy" | "unavailable";

interface AvailabilityBadgeProps {
  status: Availability;
  className?: string;
}

const AVAIL_CONFIG: Record<Availability, { dot: string; label: string; text: string; bg: string; border: string }> = {
  available:   { dot: "bg-emerald-500",   label: "Available", text: "text-emerald-700", bg: "bg-emerald-50",        border: "border-emerald-200"      },
  busy:        { dot: "bg-[#FFCC25]",     label: "Busy",      text: "text-[#7A5800]",  bg: "bg-[#FFCC25]/10",      border: "border-[#FFCC25]/40"     },
  unavailable: { dot: "bg-[#FF4555]",     label: "Away",      text: "text-[#FF4555]",  bg: "bg-[#FF4555]/8",       border: "border-[#FF4555]/25"     },
};

export function AvailabilityBadge({ status, className = "" }: AvailabilityBadgeProps) {
  const c = AVAIL_CONFIG[status] ?? AVAIL_CONFIG.unavailable;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${c.bg} ${c.text} ${c.border} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
      {c.label}
    </span>
  );
}

// ─── Submission Status Badge ──────────────────────────────────────────────────

type SubmissionStatus = "approved" | "pending" | "rejected";

interface StatusBadgeProps {
  status: SubmissionStatus;
  className?: string;
}

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; color: string; bg: string; dot: string; pulse?: boolean }> = {
  approved: { label: "Live",       color: "#0A0A0A", bg: "#00EFFE", dot: "#0D5C6F", pulse: true },
  pending:  { label: "In review",  color: "#ffffff", bg: "#0A0A0A", dot: "#FFCC25" },
  rejected: { label: "Needs work", color: "#ffffff", bg: "#FF4555", dot: "#ffffff" },
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      style={{ backgroundColor: c.bg, color: c.color }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
        {c.pulse && (
          <span
            style={{ backgroundColor: c.dot }}
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          />
        )}
        <span style={{ backgroundColor: c.dot }} className="relative inline-flex rounded-full h-1.5 w-1.5" />
      </span>
      {c.label}
    </span>
  );
}

// ─── Tag ─────────────────────────────────────────────────────────────────────

interface TagProps {
  label: string;
  variant?: "cyan" | "blue" | "gray";
}

const TAG_STYLES = {
  cyan: "bg-[#00EFFE]/10 text-[#0D5C6F] border border-[#00EFFE]/25",
  blue: "bg-[#0C5BEE]/8 text-[#0C5BEE] border border-[#0C5BEE]/20",
  gray: "bg-gray-100 text-gray-500 border border-gray-200",
};

export function Tag({ label, variant = "gray" }: TagProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${TAG_STYLES[variant]}`}>
      {label}
    </span>
  );
}
