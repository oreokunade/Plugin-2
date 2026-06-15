"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import type { QualityTier, SubmissionStatus } from "@/lib/types";

interface Props {
  id: string;
  currentStatus: SubmissionStatus;
  currentCategory: string;
  currentQualityTier: QualityTier;
  currentTags: string[];
  categories: string[];
}

export default function ReviewActions({
  id, currentStatus, currentCategory, currentQualityTier,
  currentTags, categories,
}: Props) {
  const router = useRouter();
  const [saving,      setSaving]      = useState(false);
  const [category,    setCategory]    = useState(currentCategory);
  const [qualityTier, setQualityTier] = useState<QualityTier>(currentQualityTier);
  const [tags,        setTags]        = useState(currentTags.join(", "));
  const [adminNotes,  setAdminNotes]  = useState("");

  async function updateStatus(status: SubmissionStatus) {
    setSaving(true);
    try {
      await updateDoc(doc(db, "portfolio_items", id), {
        status,
        category,
        quality_tier: qualityTier,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        admin_notes: adminNotes.trim() || null,
        updated_at: serverTimestamp(),
      });
      router.push("/admin/submissions");
      router.refresh();
    } catch (err) {
      alert("Failed to update.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-[16px] border border-gray-200 p-5 space-y-4">
      <h3 className="font-semibold text-gray-800 text-sm">Review & Tag</h3>

      {/* Category override */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00EFFE]/40 bg-white">
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Quality tier */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Quality Tier</label>
        <div className="flex gap-2">
          {(["Gold", "Silver", "Bronze"] as QualityTier[]).map((t) => (
            <button key={t} type="button" onClick={() => setQualityTier(t)}
              className={`flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                qualityTier === t
                  ? t === "Gold"   ? "border-amber-400 bg-amber-50 text-amber-700"
                    : t === "Silver" ? "border-gray-400 bg-gray-100 text-gray-700"
                    : "border-orange-300 bg-orange-50 text-orange-700"
                  : "border-gray-200 text-gray-400 hover:border-gray-300"
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Tags <span className="text-gray-400">(comma separated)</span></label>
        <input type="text" placeholder="e.g. rebrand, fintech, logo"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00EFFE]/40" />
      </div>

      {/* Admin notes */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Notes to freelancer <span className="text-gray-400">(shown on rejection)</span></label>
        <textarea rows={3} placeholder="e.g. Please upload higher resolution images…"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00EFFE]/40 resize-none" />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <button onClick={() => updateStatus("approved")} disabled={saving}
          className="flex-1 bg-[#00EFFE] hover:bg-[#00D4E0] text-[#0A0A0A] text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60">
          ✓ Approve
        </button>
        <button onClick={() => updateStatus("rejected")} disabled={saving}
          className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60">
          ✕ Reject
        </button>
      </div>

      {currentStatus !== "pending" && (
        <p className="text-xs text-gray-400 text-center">
          Current status: <span className="font-medium text-gray-600 capitalize">{currentStatus}</span>
        </p>
      )}
    </div>
  );
}
