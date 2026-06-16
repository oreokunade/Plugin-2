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
    <header className="h-[72px] bg-white border-b border-gray-100 flex items-center px-8 gap-4 flex-shrink-0">
      <div className="flex-1 min-w-0">
        <h1 className="font-display font-bold text-gray-900 text-[18px] leading-none truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-gray-400 text-[13px] mt-1 truncate">{subtitle}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 bg-[#00EFFE] hover:bg-[#00D4E0] text-[#0A0A0A] text-[13.5px] font-semibold px-5 py-2.5 rounded-xl transition-colors flex-shrink-0 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          {action.label}
        </Link>
      )}
    </header>
  );
}
