import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-14 h-14 bg-[#00EFFE]/10 rounded-2xl flex items-center justify-center mb-5">
        <svg className="w-7 h-7 text-[#00EFFE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="mb-4">
        <Logo variant="full" height={22} />
      </div>
      <h1 className="font-display font-bold text-gray-900 text-xl mb-2">Portfolio not found</h1>
      <p className="text-gray-500 text-sm max-w-xs">
        This portfolio link may be invalid or the provider&apos;s account is no longer active.
      </p>
    </div>
  );
}
