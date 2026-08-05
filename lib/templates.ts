import type { TemplateType } from "./types";

// ─── Categories & Subcategories ───────────────────────────────────────────────

export interface CategoryConfig {
  label: string;
  emoji: string;
  subcategories: string[];
}

export const CATEGORY_MAP: CategoryConfig[] = [
  {
    label: "Website, App & Software Development",
    emoji: "💻",
    subcategories: [
      "Website Development (WordPress, Shopify, Custom)",
      "Mobile App Development",
      "AI, Chatbots & Automation",
      "Cybersecurity & Ethical Hacking",
      "Blockchain & Crypto Solutions",
      "Data Science & Machine Learning",
    ],
  },
  {
    label: "Digital Marketing & E-Commerce",
    emoji: "📢",
    subcategories: [
      "Social Media Management",
      "SEO & Google Ads",
      "Facebook, Instagram & TikTok Ads",
      "Email & SMS Marketing",
      "E-commerce Store Setup (Shopify, WooCommerce)",
    ],
  },
  {
    label: "Digital & Creative Economy",
    emoji: "🎨",
    subcategories: [
      "Social Media Design",
      "Content Design",
      "UI/UX Design",
      "3D Modeling & Animation",
      "Pitch Decks & Presentations",
      "Infographics",
    ],
  },
  {
    label: "Branding, Design & Identity",
    emoji: "🚀",
    subcategories: [
      "Logo Design",
      "Brand Identity Systems",
      "Business Cards & Stationery",
      "Packaging Design",
      "Merchandise Design",
    ],
  },
  {
    label: "Writing, Editing & Publishing",
    emoji: "✍️",
    subcategories: [
      "SEO Articles & Blog Writing",
      "Copywriting",
      "Proofreading & Editing",
      "Resume Writing",
      "eBook Writing & Publishing",
    ],
  },
  {
    label: "Video, Film & Entertainment",
    emoji: "🎬",
    subcategories: [
      "Video Editing (YouTube, TikTok)",
      "Motion Graphics",
      "Animation",
      "Commercial Video Production",
      "Subtitling & Captioning",
    ],
  },
  {
    label: "Music & Audio Production",
    emoji: "🎵",
    subcategories: [
      "Music Production",
      "Podcast Editing",
      "Audiobook Narration",
      "Mixing & Mastering",
      "Jingles & Soundtracks",
    ],
  },
  {
    label: "Media, Talent & Influencer Services",
    emoji: "🎤",
    subcategories: [
      "Influencer Campaigns",
      "Content Creators",
      "Voiceover Artists",
      "Digital Brand Ambassadors",
      "Photography for Digital Use",
    ],
  },
  {
    label: "Education, Coaching & Personal Development",
    emoji: "📚",
    subcategories: [
      "Coding & Tech Skills Training",
      "Online Tutoring",
      "Career Coaching",
      "Financial Literacy Training",
      "Language Lessons",
    ],
  },
  {
    label: "Business, Corporate & Financial Services",
    emoji: "💼",
    subcategories: [
      "Market Research",
      "Business Plans",
      "Proposal & Grant Writing",
      "Lead Generation",
      "Virtual Accounting",
    ],
  },
];

// Flat array for backwards compatibility
export const CATEGORIES = CATEGORY_MAP.map((c) => c.label);

export type Category = string;

// Subcategories lookup by category label
export const SUBCATEGORIES: Record<string, string[]> = Object.fromEntries(
  CATEGORY_MAP.map((c) => [c.label, c.subcategories])
);

// ─── Category → Template mapping ──────────────────────────────────────────────

export const CATEGORY_TEMPLATE: Record<string, TemplateType> = {
  "Website, App & Software Development":        "case_study",
  "Digital Marketing & E-Commerce":             "case_study",
  "Digital & Creative Economy":                 "image_portfolio",
  "Branding, Design & Identity":                "image_portfolio",
  "Writing, Editing & Publishing":              "case_study",
  "Video, Film & Entertainment":                "video_showcase",
  "Music & Audio Production":                   "video_showcase",
  "Media, Talent & Influencer Services":        "image_portfolio",
  "Education, Coaching & Personal Development": "case_study",
  "Business, Corporate & Financial Services":   "case_study",
};

// ─── Template metadata ────────────────────────────────────────────────────────

export interface TemplateConfig {
  type: TemplateType;
  label: string;
  description: string;
  icon: string;
  sections: TemplateSectionConfig[];
}

export interface TemplateSectionConfig {
  key: string;
  label: string;
  hint?: string;
  inputType: "text" | "textarea" | "images" | "video" | "stat" | "story_builder";
  required: boolean;
  maxImages?: number;
  placeholder?: string;
}

export const TEMPLATES: Record<TemplateType, TemplateConfig> = {
  image_portfolio: {
    type: "image_portfolio",
    label: "Image Portfolio",
    description: "Best for visual work — let the images speak.",
    icon: "🖼",
    sections: [
      { key: "description", label: "Brief Description", hint: "What was the goal? What did you deliver?",  inputType: "textarea", required: false, placeholder: "e.g. Brand identity for a Lagos fintech — logo, colour system, and guidelines." },
      { key: "gallery",     label: "Project Images",    hint: "Upload your best shots — up to 20 images",   inputType: "images",   required: true,  maxImages: 20 },
    ],
  },

  case_study: {
    type: "case_study",
    label: "Case Study",
    description: "Tell the story — brief, approach, result.",
    icon: "📄",
    sections: [
      { key: "summary",  label: "Quick Summary", hint: "What was the core challenge and result?", inputType: "textarea", required: true, placeholder: "e.g. A fintech startup needed a complete brand overhaul to attract Series A investors." },
      { key: "story",    label: "Case Study Story", hint: "Mix text, images, GIFs, and videos to tell your project's story.", inputType: "story_builder", required: true },
    ],
  },

  video_showcase: {
    type: "video_showcase",
    label: "Video Showcase",
    description: "Lead with your video or audio work.",
    icon: "🎬",
    sections: [
      { key: "video",       label: "Video",                      hint: "Upload your file or paste a YouTube/Drive link", inputType: "video",    required: true  },
      { key: "description", label: "About this project",         hint: "What was it made for?",                         inputType: "textarea", required: true,  placeholder: "e.g. 60-second product launch ad for a Lagos fashion brand." },
      { key: "stills",      label: "Behind-the-scenes / Stills", hint: "Optional extra images",                         inputType: "images",   required: false, maxImages: 20 },
    ],
  },

};

export function getTemplateForCategory(category: string): TemplateConfig {
  const type = CATEGORY_TEMPLATE[category] ?? "image_portfolio";
  return TEMPLATES[type];
}

export function getSubcategoriesForCategory(category: string): string[] {
  return SUBCATEGORIES[category] ?? [];
}
