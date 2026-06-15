import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

const SCREENS = [
  {
    group: "Admin",
    color: "bg-gray-900",
    accent: "#00EFFE",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    links: [
      { label: "Overview",    sub: "Queue status at a glance",  href: "/admin" },
      { label: "Submissions", sub: "Review & approve uploads",  href: "/admin/submissions" },
    ],
  },
  {
    group: "Service Provider",
    color: "bg-white",
    accent: "#0C5BEE",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    links: [
      { label: "Onboarding",  sub: "Phone → profile setup",    href: "/onboard" },
      { label: "Dashboard",   sub: "Portfolio overview",        href: "/dashboard" },
      { label: "Upload",      sub: "Add a new project",         href: "/dashboard/upload" },
    ],
  },
  {
    group: "Client",
    color: "bg-white",
    accent: "#00EFFE",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    links: [
      { label: "Portfolio page", sub: "What a client sees via WhatsApp", href: "/p/dev-uid-001" },
    ],
  },
];

export default function DevIndex() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo variant="full" height={22} />
          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
            Dev
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-xs text-gray-400">Dev mode — no Firebase</span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">

        <div className="mb-8">
          <h1 className="font-display font-bold text-gray-900 text-2xl mb-1">PIL — Screen Index</h1>
          <p className="text-gray-500 text-sm">All screens in one place. Pick a view to preview.</p>
        </div>

        <div className="space-y-5">
          {SCREENS.map((section) => (
            <div key={section.group}
              className="bg-white rounded-2xl border border-gray-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">

              {/* Section header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: `${section.accent}18`, color: section.accent }}>
                  {section.icon}
                </div>
                <p className="font-display font-semibold text-gray-900 text-sm">{section.group}</p>
              </div>

              {/* Links */}
              <div className="divide-y divide-gray-50">
                {section.links.map((link) => (
                  <Link key={link.href} href={link.href}
                    className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors group">
                    <div>
                      <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900">{link.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{link.sub}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400 font-mono">{link.href}</span>
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Build status */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Build status</p>
          <div className="space-y-2">
            {[
              { label: "Provider onboarding",       done: true  },
              { label: "Provider dashboard",         done: true  },
              { label: "Upload flow (4 templates)",  done: true  },
              { label: "Image processing pipeline",  done: true  },
              { label: "Admin review queue",         done: true  },
              { label: "Client portfolio page",      done: true  },
              { label: "Bot API — /api/match",       done: true  },
              { label: "Security rules + indexes",   done: true  },
              { label: "Firebase credentials + go-live", done: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.done ? "bg-emerald-400" : "bg-gray-300"}`} />
                <span className={`text-sm ${item.done ? "text-gray-700" : "text-gray-400"}`}>{item.label}</span>
                {!item.done && (
                  <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">next</span>
                )}
              </div>
            ))}
          </div>
        </div>

      </main>

      <footer className="border-t border-gray-200 px-6 py-4">
        <p className="text-xs text-gray-400 text-center">Plugin PIL v1.0 · Internal dev index · Not for production</p>
      </footer>
    </div>
  );
}
