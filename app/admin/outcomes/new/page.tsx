"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin/Header";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const CATEGORIES = [
  "Web Design", "UI/UX Design", "Graphic Design",
  "Video Production", "Copywriting", "Social Media",
  "Brand Identity", "Photography", "Motion Graphics", "Other",
];

export default function NewOutcomePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    example_outputs: ["", "", ""],
    linked_portfolio_item_ids: [] as string[],
  });

  function setField(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setExample(i: number, val: string) {
    const next = [...form.example_outputs];
    next[i] = val;
    setForm((prev) => ({ ...prev, example_outputs: next }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const examples = form.example_outputs.filter(Boolean);
      await addDoc(collection(db, "outcome_cards"), {
        ...form,
        example_outputs: examples,
        linked_portfolio_item_ids: [],
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      router.push("/admin/outcomes");
    } catch (err) {
      alert("Failed to save. Check console.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminHeader title="New Outcome Card" subtitle="Create a client-facing outcome card" />
      <main className="flex-1 p-6 overflow-auto">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">

          {/* Category */}
          <Field label="Category" required>
            <select
              required
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
              className={selectCls}
            >
              <option value="">Select a category…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          {/* Title */}
          <Field label="Outcome Title" hint="What the client will see — outcome-focused" required>
            <input
              required
              type="text"
              placeholder="e.g. Increase Website Conversions"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              className={inputCls}
            />
          </Field>

          {/* Description */}
          <Field label="Description" hint="1–2 sentence explanation of the outcome" required>
            <textarea
              required
              rows={3}
              placeholder="e.g. A high-converting landing page designed to turn visitors into paying customers."
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              className={inputCls}
            />
          </Field>

          {/* Example outputs */}
          <Field label="Example Results" hint="2–3 anonymized outcome examples shown to clients">
            {form.example_outputs.map((ex, i) => (
              <input
                key={i}
                type="text"
                placeholder={`Example ${i + 1}…`}
                value={ex}
                onChange={(e) => setExample(i, e.target.value)}
                className={`${inputCls} mb-2`}
              />
            ))}
          </Field>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-cyan hover:bg-cyan-dark text-near-black font-semibold px-6 py-3.5 rounded-[10px] transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : "Create Outcome Card"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-3.5 rounded-[10px] transition-colors"
            >
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

const inputCls =
  "w-full bg-[#F1F3F7] border border-transparent rounded-xl px-4 py-3 text-[13.5px] text-gray-800 focus:outline-none focus:bg-white focus:border-[#00EFFE] focus:ring-2 focus:ring-[#00EFFE]/20 transition-all";
const selectCls =
  "w-full bg-[#F1F3F7] border border-transparent rounded-xl px-4 py-3 text-[13.5px] text-gray-800 focus:outline-none focus:bg-white focus:border-[#00EFFE] focus:ring-2 focus:ring-[#00EFFE]/20 transition-all bg-white";
