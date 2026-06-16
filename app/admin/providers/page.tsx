import Link from "next/link";
import { AdminHeader } from "@/components/admin/Header";
import { adminDb, ADMIN_DEV_MODE } from "@/lib/firebase-admin";
import { TierBadge } from "@/components/ui/Badge";
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

const AVAILABILITY_STYLES = {
  available:   "bg-emerald-50 text-emerald-700 border border-emerald-200",
  busy:        "bg-amber-50   text-amber-700   border border-amber-200",
  unavailable: "bg-red-50     text-red-600     border border-red-200",
};

export default async function ProvidersPage() {
  const providers = await getProviders();

  return (
    <>
      <AdminHeader
        title="Providers"
        subtitle={`${providers.length} registered — Layer 2 internal only`}
        action={{ label: "Add Provider", href: "/admin/providers/new" }}
      />
      <main className="flex-1 p-6 overflow-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-sm text-amber-700 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Provider data is strictly internal. Names, contacts, and links are never exposed to the client API.
        </div>

        {providers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Skills</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Tier</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {providers.map((provider) => (
                  <tr key={provider.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-800">{provider.name}</div>
                      <div className="text-xs text-gray-400">{provider.phone}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-gray-500 text-xs">
                        {provider.skills?.slice(0, 3).join(", ")}
                        {(provider.skills?.length ?? 0) > 3 && ` +${provider.skills.length - 3}`}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <TierBadge tier={provider.quality_tier} />
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${AVAILABILITY_STYLES[provider.availability] ?? "bg-gray-100 text-gray-500"}`}>
                        {provider.availability}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/providers/${provider.id}/edit`}
                        className="text-xs text-gray-400 hover:text-[#0C5BEE] transition-colors"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        className="bg-[#00EFFE] hover:bg-[#00D4E0] text-[#0A0A0A] text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
      >
        Add Provider
      </Link>
    </div>
  );
}
