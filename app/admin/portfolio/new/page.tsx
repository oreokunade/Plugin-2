"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin/Header";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { QualityTier } from "@/lib/types";

const CATEGORIES = [
  "Web Design", "UI/UX Design", "Graphic Design",
  "Video Production", "Copywriting", "Social Media",
  "Brand Identity", "Photography", "Motion Graphics", "Other",
];

const STYLE_TAGS = ["Clean & Minimal", "Bold & Modern", "Premium & Corporate"];

export default function NewPortfolioItemPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [form, setForm] = useState({
    provider_id: "",
    category: "",
    subcategory: "",
    style_tag: "",
    outcome_tags: [""],
    quality_tier: "Silver" as QualityTier,
    media_urls: [] as string[],
  });
  const [files, setFiles] = useState<FileList | null>(null);

  function setField(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setTag(i: number, val: string) {
    const next = [...form.outcome_tags];
    next[i] = val;
    setForm((prev) => ({ ...prev, outcome_tags: next }));
  }

  function addTag() {
    setForm((prev) => ({ ...prev, outcome_tags: [...prev.outcome_tags, ""] }));
  }

  async function uploadFiles(providerId: string): Promise<string[]> {
    if (!files || files.length === 0) return [];
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Uploading ${i + 1}/${files.length}…`);
      const path = `portfolio/${providerId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      urls.push(url);
    }
    setUploadProgress(null);
    return urls;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.provider_id.trim()) {
      alert("Provider ID is required.");
      return;
    }
    setSaving(true);
    try {
      const mediaUrls = await uploadFiles(form.provider_id.trim());
      const outcomeTags = form.outcome_tags.filter(Boolean);

      await addDoc(collection(db, "portfolio_items"), {
        provider_id: form.provider_id.trim(),
        category: form.category,
        subcategory: form.subcategory || null,
        style_tag: form.style_tag || null,
        outcome_tags: outcomeTags,
        quality_tier: form.quality_tier,
        media_urls: mediaUrls,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      router.push("/admin/portfolio");
    } catch (err) {
      alert("Failed to save.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminHeader title="Add Portfolio Item" subtitle="Layer 2 internal item — provider ID never exposed to clients" />
      <main className="flex-1 p-6 overflow-auto">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">

          {/* Provider ID — internal only */}
          <div className="rounded-xl border border-red/30 bg-red/5 p-4">
            <Field label="Provider ID" hint="Internal reference only. Never exposed to clients." required>
              <input required type="text" placeholder="Provider document ID from Firestore"
                value={form.provider_id}
                onChange={(e) => setField("provider_id", e.target.value)}
                className={inputCls} />
            </Field>
          </div>

          {/* Category */}
          <Field label="Category" required>
            <select required value={form.category} onChange={(e) => setField("category", e.target.value)} className={selectCls}>
              <option value="">Select category…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          {/* Subcategory */}
          <Field label="Subcategory" hint="Optional — more specific classification">
            <input type="text" placeholder="e.g. E-commerce, SaaS, Landing Page…"
              value={form.subcategory}
              onChange={(e) => setField("subcategory", e.target.value)}
              className={inputCls} />
          </Field>

          {/* Quality tier */}
          <Field label="Quality Tier" required>
            <div className="flex gap-3">
              {(["Gold", "Silver", "Bronze"] as QualityTier[]).map((tier) => (
                <button key={tier} type="button" onClick={() => setField("quality_tier", tier)}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.quality_tier === tier
                      ? tier === "Gold" ? "border-yellow bg-yellow/10 text-yellow-dark"
                        : tier === "Silver" ? "border-gray-400 bg-gray-100 text-gray-700"
                        : "border-red/50 bg-red/10 text-red-dark"
                      : "border-gray-200 text-gray-500"
                  }`}>
                  {tier}
                </button>
              ))}
            </div>
          </Field>

          {/* Style tag (visual categories) */}
          <Field label="Style Tag" hint="Only for visual categories (Design, Video, Photo)">
            <select value={form.style_tag} onChange={(e) => setField("style_tag", e.target.value)} className={selectCls}>
              <option value="">None</option>
              {STYLE_TAGS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          {/* Outcome tags */}
          <Field label="Outcome Tags" hint="Keywords that describe what this work achieves">
            {form.outcome_tags.map((tag, i) => (
              <input key={i} type="text" placeholder={`Outcome tag ${i + 1}…`}
                value={tag}
                onChange={(e) => setTag(i, e.target.value)}
                className={`${inputCls} mb-2`} />
            ))}
            <button type="button" onClick={addTag}
              className="text-sm text-cyan hover:text-cyan-dark font-medium">
              + Add another tag
            </button>
          </Field>

          {/* Media upload */}
          <Field label="Media Files" hint="Images or videos — stored in Firebase Storage">
            <input type="file" multiple accept="image/*,video/*"
              onChange={(e) => setFiles(e.target.files)}
              className="w-full border border-dashed border-gray-300 rounded-xl px-4 py-6 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan file:text-near-black hover:file:bg-cyan-dark" />
            {uploadProgress && (
              <p className="text-sm text-cyan mt-2">{uploadProgress}</p>
            )}
          </Field>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-cyan hover:bg-cyan-dark text-near-black font-semibold px-6 py-3.5 rounded-[10px] transition-colors disabled:opacity-60">
              {saving ? (uploadProgress ?? "Saving…") : "Add Portfolio Item"}
            </button>
            <button type="button" onClick={() => router.back()}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-3.5 rounded-[10px] transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </main>
    </>
  );
}

function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block font-display font-600 text-gray-800 text-sm mb-1">
        {label} {required && <span className="text-red">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[#F1F3F7] border border-transparent rounded-xl px-4 py-3 text-[13.5px] text-gray-800 focus:outline-none focus:bg-white focus:border-[#00EFFE] focus:ring-2 focus:ring-[#00EFFE]/20 transition-all";
const selectCls = "w-full bg-[#F1F3F7] border border-transparent rounded-xl px-4 py-3 text-[13.5px] text-gray-800 focus:outline-none focus:bg-white focus:border-[#00EFFE] focus:ring-2 focus:ring-[#00EFFE]/20 transition-all bg-white";
