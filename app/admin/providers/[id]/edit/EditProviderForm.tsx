"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProvider } from "../../actions";
import { CATEGORY_MAP } from "@/lib/templates";
import type { Provider, QualityTier } from "@/lib/types";

const AVAILABILITY = ["available", "busy", "unavailable"] as const;

export default function EditProviderForm({ provider }: { provider: Provider }) {
  const router  = useRouter();
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const nameParts = provider.name?.split(" ") ?? ["", ""];
  const [firstName,    setFirstName]    = useState(provider.first_name || nameParts[0] || "");
  const [lastName,     setLastName]     = useState(provider.last_name  || nameParts.slice(1).join(" ") || "");
  const [phone,        setPhone]        = useState(provider.phone || "");
  const [category,     setCategory]     = useState(provider.category || "");
  const [bio,          setBio]          = useState(provider.bio || "");
  const [qualityTier,  setQualityTier]  = useState<QualityTier>(provider.quality_tier || "Bronze");
  const [availability, setAvailability] = useState<typeof AVAILABILITY[number]>(provider.availability || "available");
  const [skills,       setSkills]       = useState<string[]>(provider.skills?.length ? provider.skills : [""]);

  function setSkill(i: number, val: string) {
    setSkills((prev) => { const next = [...prev]; next[i] = val; return next; });
  }
  function addSkill()    { setSkills((prev) => [...prev, ""]); }
  function removeSkill(i: number) { setSkills((prev) => prev.filter((_, idx) => idx !== i)); }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateProvider(provider.id, {
      first_name:   firstName.trim(),
      last_name:    lastName.trim(),
      name:         `${firstName.trim()} ${lastName.trim()}`,
      phone:        phone.trim(),
      category,
      bio:          bio.trim(),
      quality_tier: qualityTier,
      availability,
      skills:       skills.map((s) => s.trim()).filter(Boolean),
    });
    setSaving(false);
    if (!result.ok) { setError(result.error ?? "Failed to save."); return; }
    setDone(true);
    setTimeout(() => router.push("/admin/providers"), 1000);
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* Internal-only notice */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <p className="text-[13px] text-amber-700">
          Provider identity is internal only. Names and contacts are never exposed in the client API.
        </p>
      </div>

      {/* Name */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="First Name">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name" className={inputCls} />
        </Field>
        <Field label="Last Name">
          <input value={lastName} onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name" className={inputCls} />
        </Field>
      </div>

      {/* Phone */}
      <Field label="WhatsApp / Phone">
        <input value={phone} onChange={(e) => setPhone(e.target.value)}
          placeholder="+234..." className={inputCls} />
      </Field>

      {/* Category */}
      <Field label="Primary Category">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
          <option value="">Select category…</option>
          {CATEGORY_MAP.map((c) => (
            <option key={c.label} value={c.label}>{c.emoji} {c.label}</option>
          ))}
        </select>
      </Field>

      {/* Bio */}
      <Field label="Bio" hint="Shown on their public portfolio page">
        <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)}
          placeholder="Short intro — what they specialise in…"
          className={`${inputCls} resize-none`} />
      </Field>

      {/* Quality tier */}
      <Field label="Quality Tier">
        <div className="flex gap-3">
          {(["Gold", "Silver", "Bronze"] as QualityTier[]).map((t) => (
            <button key={t} type="button" onClick={() => setQualityTier(t)}
              className={`flex-1 py-2.5 rounded-xl border-2 text-[13px] font-semibold transition-all ${
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
      </Field>

      {/* Availability */}
      <Field label="Availability">
        <div className="flex gap-3">
          {AVAILABILITY.map((s) => (
            <button key={s} type="button" onClick={() => setAvailability(s)}
              className={`flex-1 py-2.5 rounded-xl border-2 text-[13px] font-medium capitalize transition-all ${
                availability === s
                  ? s === "available"   ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : s === "busy"      ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-red-300 bg-red-50 text-red-600"
                  : "border-gray-200 text-gray-400 hover:border-gray-300"
              }`}>
              {s}
            </button>
          ))}
        </div>
      </Field>

      {/* Skills */}
      <Field label="Skills">
        <div className="space-y-2">
          {skills.map((skill, i) => (
            <div key={i} className="flex gap-2">
              <input value={skill} onChange={(e) => setSkill(i, e.target.value)}
                placeholder={`Skill ${i + 1}…`} className={`${inputCls} flex-1`} />
              {skills.length > 1 && (
                <button type="button" onClick={() => removeSkill(i)}
                  className="p-2.5 text-gray-400 hover:text-red-500 transition-colors rounded-xl border border-gray-200 hover:border-red-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addSkill}
            className="text-[13px] text-[#0C5BEE] hover:text-[#0841B5] font-medium transition-colors">
            + Add skill
          </button>
        </div>
      </Field>

      {/* Error */}
      {error && (
        <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={handleSave} disabled={saving || done}
          className="bg-[#00EFFE] hover:bg-[#00D4E0] text-[#0A0A0A] font-semibold text-[13.5px] px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
          {saving ? <><Spinner /> Saving…</> : done ? "✓ Saved" : "Save Changes"}
        </button>
        <button type="button" onClick={() => router.push("/admin/providers")}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-[13.5px] px-6 py-2.5 rounded-xl transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-semibold text-gray-800 text-[13px] mb-1">{label}</label>
      {hint && <p className="text-[12px] text-gray-400 mb-1.5">{hint}</p>}
      {children}
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

const inputCls = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13.5px] text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#00EFFE]/40 focus:border-[#00EFFE] transition-colors";
