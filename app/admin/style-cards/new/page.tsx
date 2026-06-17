"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin/Header";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const CATEGORIES = [
  "Web Design", "UI/UX Design", "Graphic Design",
  "Video Production", "Photography", "Motion Graphics",
];

const STYLE_LABELS = [
  "Clean & Minimal",
  "Bold & Modern",
  "Premium & Corporate",
];

export default function NewStyleCardPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: "",
    style_label: "",
    description: "",
    portfolio_item_ids: [] as string[],
  });
  const [itemInput, setItemInput] = useState("");

  function setField(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addItemId() {
    const trimmed = itemInput.trim();
    if (trimmed && !form.portfolio_item_ids.includes(trimmed)) {
      setForm((prev) => ({
        ...prev,
        portfolio_item_ids: [...prev.portfolio_item_ids, trimmed],
      }));
    }
    setItemInput("");
  }

  function removeItemId(id: string) {
    setForm((prev) => ({
      ...prev,
      portfolio_item_ids: prev.portfolio_item_ids.filter((i) => i !== id),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "style_cards"), {
        ...form,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      router.push("/admin/style-cards");
    } catch (err) {
      alert("Failed to save.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminHeader title="New Style Card" subtitle="Visual categories only" />
      <main className="flex-1 p-6 overflow-auto">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">

          {/* Category */}
          <Field label="Category" required>
            <select required value={form.category} onChange={(e) => setField("category", e.target.value)} className={selectCls}>
              <option value="">Select a visual category…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          {/* Style label */}
          <Field label="Style Label" hint="The style aesthetic this card represents" required>
            <div className="grid grid-cols-3 gap-3">
              {STYLE_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setField("style_label", label)}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    form.style_label === label
                      ? "border-cyan bg-cyan/10 text-dark-teal"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {form.style_label === "" && (
              <input type="text" placeholder="Or type a custom style label…"
                onChange={(e) => setField("style_label", e.target.value)}
                className={`${inputCls} mt-2`} />
            )}
          </Field>

          {/* Description */}
          <Field label="Description" required>
            <textarea required rows={3} placeholder="Describe this visual style…"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              className={inputCls} />
          </Field>

          {/* Linked portfolio items */}
          <Field label="Portfolio Item IDs" hint="Paste portfolio item document IDs to link">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Paste item ID…"
                value={itemInput}
                onChange={(e) => setItemInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItemId(); }}}
                className={inputCls}
              />
              <button type="button" onClick={addItemId}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3.5 rounded-xl text-sm font-medium whitespace-nowrap">
                Add
              </button>
            </div>
            {form.portfolio_item_ids.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.portfolio_item_ids.map((id) => (
                  <span key={id} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-full">
                    <code>{id.slice(0, 12)}…</code>
                    <button type="button" onClick={() => removeItemId(id)} className="text-gray-400 hover:text-red">×</button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-cyan hover:bg-cyan-dark text-near-black font-semibold px-6 py-3.5 rounded-[10px] transition-colors disabled:opacity-60">
              {saving ? "Saving…" : "Create Style Card"}
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
