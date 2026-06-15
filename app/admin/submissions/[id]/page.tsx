import { adminDb } from "@/lib/firebase-admin";
import { AdminHeader } from "@/components/admin/Header";
import type { PortfolioItem, Provider } from "@/lib/types";
import { notFound } from "next/navigation";
import ReviewActions from "./ReviewActions";

async function getSubmission(id: string) {
  const itemDoc = await adminDb.collection("portfolio_items").doc(id).get();
  if (!itemDoc.exists) return null;
  const item = { id: itemDoc.id, ...itemDoc.data() } as PortfolioItem;
  const provDoc = await adminDb.collection("providers").doc(item.provider_id).get();
  const provider = provDoc.exists ? ({ id: provDoc.id, ...provDoc.data() } as Provider) : null;
  return { item, provider };
}

const CATEGORIES = [
  "Photography", "Graphic Design", "Brand Identity", "Motion Graphics",
  "Video Production", "Copywriting", "UI/UX Design", "Software Development",
  "Social Media", "Web Design", "Content Creation", "Other",
];

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getSubmission(id);
  if (!data) notFound();
  const { item, provider } = data;

  return (
    <>
      <AdminHeader title="Review Submission" subtitle={item.title} />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-3xl grid md:grid-cols-2 gap-6">

          {/* Media — derive from cover_image + blocks */}
          <div className="space-y-3">
            <h3 className="font-display font-700 text-gray-800 text-sm">Media</h3>
            {item.cover_image ? (
              <div className="grid grid-cols-2 gap-2">
                <a href={item.cover_image} target="_blank" rel="noreferrer" className="block">
                  <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden hover:opacity-80 transition-opacity">
                    <img src={item.cover_image} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                </a>
                {item.blocks.flatMap((b) => b.type === "images" ? b.urls : b.type === "before_after" ? [...b.before, ...b.after] : []).slice(0, 5).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                    <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden hover:opacity-80 transition-opacity">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400 text-sm">No media uploaded</div>
            )}

            {/* Provider info — internal admin view only */}
            {provider && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 mb-2">PROVIDER (INTERNAL ONLY)</p>
                <div className="space-y-1 text-sm">
                  <p><span className="text-amber-600">Name:</span> <span className="text-gray-800">{provider.name}</span></p>
                  <p><span className="text-amber-600">Phone:</span> <span className="text-gray-800">{provider.phone}</span></p>
                  <p><span className="text-amber-600">Category:</span> <span className="text-gray-800">{provider.category}</span></p>
                  <p><span className="text-amber-600">Skills:</span> <span className="text-gray-800">{provider.skills?.join(", ") || "—"}</span></p>
                  <p><span className="text-amber-600">Tier:</span> <span className="text-gray-800">{provider.quality_tier}</span></p>
                </div>
              </div>
            )}
          </div>

          {/* Review form */}
          <div className="space-y-4">
            <div className="bg-white rounded-[16px] border border-gray-200 p-5 space-y-4">
              <h3 className="font-display font-700 text-gray-800 text-sm">Submission Details</h3>
              <Info label="Title" value={item.title} />
              <Info label="Category" value={item.category} />
              <Info label="Template" value={item.template_type} />
              <Info label="Status" value={
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                  item.status === "approved" ? "bg-emerald-100 text-emerald-700"
                  : item.status === "rejected" ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700"
                }`}>{item.status}</span>
              } />
            </div>

            {/* Review actions */}
            <ReviewActions
              id={item.id}
              currentStatus={item.status}
              currentCategory={item.category}
              currentQualityTier={item.quality_tier}
              currentTags={item.tags ?? []}
              categories={CATEGORIES}
            />
          </div>
        </div>
      </main>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <div className="text-sm text-gray-800">{value}</div>
    </div>
  );
}
