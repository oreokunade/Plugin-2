"use client";

import Link from "next/link";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    href: string;
  };
}

export function AdminHeader({ title, subtitle, action }: AdminHeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
      <div className="flex-1 min-w-0">
        <h1 className="font-display font-semibold text-gray-900 text-base leading-none truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-gray-400 text-xs mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1.5 bg-[#00EFFE] hover:bg-[#00D4E0] text-[#0A0A0A] text-sm font-semibold px-4 py-2 rounded-xl transition-colors flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          {action.label}
        </Link>
      )}
    </header>
  );
}
