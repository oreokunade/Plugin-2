/**
 * lib/mockImages.ts
 * Topic-relevant Unsplash placeholders for dev/mock data.
 * Each image is hand-picked to match its subject (branding, fashion, video…)
 * so mock content looks like real portfolio work instead of random photos.
 */

const img = (id: string, w = 800, h?: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}${h ? `&h=${h}&fit=crop` : ""}&q=80&auto=format`;

export const MOCK_IMG = {
  // Branding, Design & Identity — stationery, logo work, design desks
  branding: {
    cover: img("1561070791-2526d30994b5", 1200),          // brand stationery mockup
    samples: [
      img("1558655146-9f40138edfeb", 600, 600),           // designer desk with tablet
      img("1581291518857-4e27b48ff24e", 600, 600),        // design workspace
    ],
  },

  // Digital Marketing / Social media — fashion content
  fashion: {
    cover: img("1483985988355-763728e1935b", 1200),       // fashion shopping editorial
    posts: [
      img("1529139574466-a303027c1d8b", 600, 600),        // street-style fashion
      img("1515886657613-9f3515b0c78f", 600, 600),        // fashion model
      img("1509631179647-0177331693ae", 600, 600),        // colourful fashion portrait
      img("1445205170230-053b83016050", 600, 600),        // clothing rail
    ],
  },

  // Video, Film & Entertainment — cameras, sets, production
  video: {
    cover: img("1574717024653-61fd2cf4d44d", 1200),       // videographer filming
    stills: [
      img("1485846234645-a62644f84728", 600, 400),        // cinema camera rig
      img("1478720568477-152d9b164e26", 600, 400),        // film production set
      img("1518709268805-4e9042af9f23", 600, 400),        // neon abstract (motion frame)
    ],
  },

  // Business / pitch decks — meetings, planning, analytics
  pitch: {
    cover: img("1454165804606-c3d57bc86b40", 1200),       // business planning docs
    samples: [
      img("1460925895917-afdab827c52f", 600, 600),        // laptop with analytics
      img("1552664730-d307ca884978", 600, 600),           // team workshop sticky notes
    ],
  },

  // UI/UX — app design, wireframes, devices
  ux: {
    cover: img("1551650975-87deedd944c3", 1200),          // mobile app design
    samples: [
      img("1512941937669-90a1b58e7e9c", 600, 600),        // phone in hand
    ],
  },

  // Motion graphics — abstract light & colour
  motion: {
    cover: img("1550745165-9bc0b252726f", 1200),          // retro neon tech
  },
} as const;
