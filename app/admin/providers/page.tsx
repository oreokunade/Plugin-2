import Link from "next/link";
import { AdminHeader } from "@/components/admin/Header";
import { adminDb, ADMIN_DEV_MODE } from "@/lib/firebase-admin";
import { TierBadge, AvailabilityBadge } from "@/components/ui/Badge";
import type { Provider } from "@/lib/types";

const DEV_PROVIDERS: Provider[] = [
  { id: "dev-uid-001", uid: "dev-uid-001", first_name: "Dara",  last_name: "Okunade", name: "Dara Okunade",  phone: "+2348012345678", category: "Branding, Design & Identity",    subcategories: ["Logo Design", "Brand Identity Systems"], bio: "5 years building brands for Nigerian startups.", skills: ["Logo Design", "Brand Identity Systems"], quality_tier: "Gold",   availability: "available",   onboarding_complete: true, created_at: "", updated_at: "" },
  { id: "dev-uid-002", uid: "dev-uid-002", first_name: "Emeka", last_name: "Okafor",  name: "Emeka Okafor",  phone: "+2348023456789", category: "Digital Marketing & E-Commerce", subcategories: ["Social Media Management"],                bio: "Social media strategist with 3 years experience.", skills: ["Social Media Management", "SEO"],           quality_tier: "Silver", availability: "busy",        onboarding_complete: true, created_at: "", updated_at: "" },
  { id: "dev-uid-003", uid: "dev-uid-003", first_name: "Bola",  last_name: "Adeyemi", name: "Bola Adeyemi",  phone: "+2348034567890", category: "Video, Film & Entertainment",    subcategories: ["Video Editing (YouTube, TikTok)"],        bio: "Videographer and editor based in Lagos.",           skills: ["Video Editing (YouTube, TikTok)"],             quality_tier: "Bronze", availability: "unavailable", onboarding_complete: true, created_at: "", updated_at: "" },
];

async function getProviders(): Promise<Provider[]> {
  if (ADMIN_DEV_MODE) return DEV_PROVIDERS;
  try {
    const snap = await adminDb
      .collection("providers")
      .orderBy("created_at", "desc")
      .limit(100)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Provider[];
  } catch {
    return [];
  }
}


export default async function ProvidersPage() {
  const providers = await getProviders();

  return (
    <>
      <AdminHeader
        title="Providers"
        subtitle={`${providers.length} registered — Layer 2 internal only`}
        action={{ label: "Add Provider", href: "/admin/providers/new" }}
      />
      <main className="flex-1 p-4 sm:p-6 overflow-auto">
        {providers.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-400 px-5 py-3">Name</th>
                    <th className="text-left text-xs font-semibold text-gray-400 px-5 py-3">Skills</th>
                    <th className="text-left text-xs font-semibold text-gray-400 px-5 py-3">Tier</th>
                    <th className="text-left text-xs font-semibold text-gray-400 px-5 py-3">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {providers.map((provider) => (
                    <tr key={provider.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-gray-800 text-[13px]">{provider.name}</div>
                        <div className="text-xs text-gray-400">{provider.phone}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-gray-500 text-xs">
                          {provider.skills?.slice(0, 2).join(", ")}
                          {(provider.skills?.length ?? 0) > 2 && ` +${provider.skills.length - 2}`}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <TierBadge tier={provider.quality_tier} />
                      </td>
                      <td className="px-5 py-3.5">
                        <AvailabilityBadge status={provider.availability as "available" | "busy" | "unavailable"} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/admin/providers/${provider.id}/edit`}
                          className="text-xs text-gray-400 hover:text-[#0C5BEE] transition-colors font-medium">
                          Edit →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {providers.map((provider) => (
                <div key={provider.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold text-gray-900 text-[14px]">{provider.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{provider.phone}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <TierBadge tier={provider.quality_tier} />
                      <AvailabilityBadge status={provider.availability as "available" | "busy" | "unavailable"} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                    {provider.skills?.slice(0, 3).join(" · ")}
                  </p>
                  <Link href={`/admin/providers/${provider.id}/edit`}
                    className="text-xs text-[#0C5BEE] font-semibold">
                    Edit provider →
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h3 className="font-display font-700 text-gray-900 mb-2">No providers yet</h3>
      <p className="text-gray-500 text-sm mb-6">Add providers to the internal database. Their identity is never visible to clients.</p>
      <Link
        href="/admin/providers/new"
        className="bg-[#00EFFE] hover:bg-[#00D4E0] text-[#0A0A0A] text-sm font-semibold px-5 py-3.5 rounded-xl transition-colors"
      >
        Add Provider
      </Link>
    </div>
  );
}
