// ─── Quality Tiers ───────────────────────────────────────────────────────────

export type QualityTier = "Gold" | "Silver" | "Bronze";

export const QUALITY_SCORE: Record<QualityTier, number> = {
  Gold: 1.0,
  Silver: 0.7,
  Bronze: 0.4,
};

// ─── Submission lifecycle ─────────────────────────────────────────────────────

export type SubmissionStatus = "pending" | "approved" | "rejected";

// ─── Template system ──────────────────────────────────────────────────────────

export type TemplateType =
  | "image_portfolio"   // Photography, Graphic Design, Brand Identity
  | "case_study"        // Copywriting, UI/UX, Software Dev, Social Media
  | "video_showcase";   // Video Production, Motion Graphics

export interface TextStyleOptions {
  size?: "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  weight?: "normal" | "medium" | "semibold" | "bold";
  color?: string;
  underline?: boolean;
  width?: "narrow" | "base" | "wide" | "full";
  fontFamily?: string;
}

export type ContentBlock =
  | { type: "text";         label: string; content: string; style?: TextStyleOptions }
  | { type: "images";       urls: string[]; caption?: string; captions?: string[]; layout?: "vertical" | "slideshow"; spacing?: number }
  | { type: "video";        url: string; thumbnail?: string }
  | { type: "stat";         label: string; value: string };

// ─── Layer 2 — Internal Only ──────────────────────────────────────────────────

export interface Provider {
  id: string;
  uid: string;              // Firebase Auth UID
  first_name: string;
  last_name: string;
  name: string;             // computed: first_name + " " + last_name
  phone: string;            // verified WhatsApp number
  category: string;         // primary service category
  subcategories: string[];  // up to 5 selected subcategories
  bio?: string;
  skills: string[];
  quality_tier: QualityTier;
  availability: "available" | "busy" | "unavailable";
  onboarding_complete: boolean;
  bot_onboarded?: boolean;  // true if profile came from WhatsApp bot
  created_at: string;
  updated_at: string;
}

export interface PortfolioItem {
  id: string;
  provider_id: string;      // internal — never exposed to clients
  title: string;
  cover_image: string;      // required hero image
  template_type: TemplateType;
  blocks: ContentBlock[];   // ordered content sections
  category: string;
  tags: string[];
  status: SubmissionStatus; // only "approved" items reach the bot API
  raw_sections?: any;       // preserves editor state for editing
  admin_notes?: string;
  quality_tier: QualityTier;
  ocr_flagged?: boolean;    // auto-detected contact info in images
  created_at: string;
  updated_at: string;
}

// ─── Layer 1 — Client-Facing (bot API) ───────────────────────────────────────

export interface PublicPortfolioItem {
  id: string;
  category: string;
  tags: string[];
  cover_image: string;
  blocks: ContentBlock[];   // blocks with sanitized URLs only
  quality_tier: QualityTier;
}

export interface OutcomeCard {
  id: string;
  title: string;
  description: string;
  category: string;
  example_outputs: string[];
  linked_portfolio_item_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface StyleCard {
  id: string;
  category: string;
  style_label: "Clean & Minimal" | "Bold & Modern" | "Premium & Corporate" | string;
  description: string;
  portfolio_item_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface PublicOutcomeCard {
  id: string;
  title: string;
  description: string;
  category: string;
  example_outputs: string[];
  sample_items: PublicPortfolioItem[];
}

export interface PublicStyleCard {
  id: string;
  category: string;
  style_label: string;
  description: string;
  sample_items: PublicPortfolioItem[];
}

export interface EngagementLog {
  card_id: string;
  card_type: "outcome" | "style";
  views: number;
  selections: number;
}

// ─── Ranking ──────────────────────────────────────────────────────────────────

export interface RankingContext {
  category: string;
  tags?: string[];          // free-form tags from client request (replaces outcome_tag / style_tag)
}

export interface ScoredItem {
  item: PortfolioItem;
  score: number;
  quality_score: number;
  relevance_score: number;
  diversity_score: number;
}

// ─── API Request/Response ─────────────────────────────────────────────────────

export interface MatchRequest {
  category: string;
  tags?: string[];           // e.g. ["logo", "rebrand", "fintech"] extracted from client message
  limit?: number;
}

export interface MatchResult {
  provider_id: string;
  quality_tier: QualityTier;
  score: number;
  availability: string;
}
