"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewSubmission } from "./actions";
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
  const [done,        setDone]        = useState<SubmissionStatus | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [category,    setCategory]    = useState(currentCategory);
  const [qualityTier, setQualityTier] = useState<QualityTier>(currentQualityTier);
  const [tags,        setTags]        = useState(currentTags.join(", "));
  const [adminNotes,  setAdminNotes]  = useState("");

  async function handleReview(status: SubmissionStatus) {
    setSaving(true);
    setError(null);

    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const result  = await reviewSubmission(id, status, category, qualityTier, tagList, adminNotes);

    setSaving(false);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }

    setDone(status);
    setTimeout(() => router.push("/admin/submissions"), 1200);
  }

  if (done) {
    return (
      <div className={`rounded-2xl border p-6 text-center ${
        done === "approved"
          ? "bg-emerald-50 border-emerald-200"
          : "bg-red-50 border-red-200"
      }`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 ${
          done === "approved" ? "bg-emerald-100" : "bg-red-100"
        }`}>
          {done === "approved" ? (
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <p className={`text-sm font-semibold ${done === "approved" ? "text-emerald-700" : "text-red-600"}`}>
          {done === "approved" ? "Approved and live" : "Submission rejected"}
        </p>
        <p className="text-xs text-gray-400 mt-1">Returning to queue…</p>
      </div>
    );
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
        <label className="block text-xs text-gray-500 mb-1">
          Tags <span className="text-gray-400">(comma separated)</span>
        </label>
        <input type="text" placeholder="e.g. rebrand, fintech, logo"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00EFFE]/40" />
      </div>

      {/* Admin notes */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          Notes to freelancer <span className="text-gray-400">(shown on rejection)</span>
        </label>
        <textarea rows={3} placeholder="e.g. Please upload higher resolution images…"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00EFFE]/40 resize-none" />
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <button onClick={() => handleReview("approved")} disabled={saving}
          className="flex-1 bg-[#00EFFE] hover:bg-[#00D4E0] text-[#0A0A0A] text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Spinner /> : "✓ Approve"}
        </button>
        <button onClick={() => handleReview("rejected")} disabled={saving}
          className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Spinner /> : "✕ Reject"}
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

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
