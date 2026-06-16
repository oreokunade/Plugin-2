"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin/Header";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { QualityTier } from "@/lib/types";

export default function NewProviderPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    skills: [""],
    quality_tier: "Silver" as QualityTier,
    availability: "available" as "available" | "busy" | "unavailable",
    external_links: [""],
  });

  function setField(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setArrayField(key: "skills" | "external_links", i: number, val: string) {
    setForm((prev) => {
      const next = [...prev[key]];
      next[i] = val;
      return { ...prev, [key]: next };
    });
  }

  function addArrayField(key: "skills" | "external_links") {
    setForm((prev) => ({ ...prev, [key]: [...prev[key], ""] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const skills = form.skills.filter(Boolean);
      const external_links = form.external_links.filter(Boolean);

      await addDoc(collection(db, "providers"), {
        name: form.name,
        contact_info: {
          email: form.email,
          phone: form.phone || null,
          whatsapp: form.whatsapp || null,
        },
        skills,
        quality_tier: form.quality_tier,
        availability: form.availability,
        external_links,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      router.push("/admin/providers");
    } catch (err) {
      alert("Failed to save.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminHeader title="Add Provider" subtitle="Internal Layer 2 — never exposed to clients" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-700">
          All information on this form is stored in Layer 2 (internal only). Provider names, contacts, and links will never appear in any client-facing API response.
        </div>

        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">

          {/* Name */}
          <Field label="Full Name" required>
            <input required type="text" placeholder="Provider's full name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              className={inputCls} />
          </Field>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" required>
              <input required type="email" placeholder="provider@email.com"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                className={inputCls} />
            </Field>
            <Field label="WhatsApp">
              <input type="tel" placeholder="+234..."
                value={form.whatsapp}
                onChange={(e) => setField("whatsapp", e.target.value)}
                className={inputCls} />
            </Field>
          </div>

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

          {/* Availability */}
          <Field label="Availability">
            <div className="flex gap-3">
              {(["available", "busy", "unavailable"] as const).map((status) => (
                <button key={status} type="button" onClick={() => setField("availability", status)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium capitalize transition-all ${
                    form.availability === status
                      ? "border-cyan bg-cyan/10 text-dark-teal"
                      : "border-gray-200 text-gray-500"
                  }`}>
                  {status}
                </button>
              ))}
            </div>
          </Field>

          {/* Skills */}
          <Field label="Skills" hint="Areas of expertise">
            {form.skills.map((skill, i) => (
              <input key={i} type="text" placeholder={`Skill ${i + 1}…`}
                value={skill}
                onChange={(e) => setArrayField("skills", i, e.target.value)}
                className={`${inputCls} mb-2`} />
            ))}
            <button type="button" onClick={() => addArrayField("skills")}
              className="text-sm text-cyan hover:text-cyan-dark font-medium">
              + Add skill
            </button>
          </Field>

          {/* External links (internal only) */}
          <Field label="External Links" hint="Behance, Instagram, portfolio links — stored internally only">
            {form.external_links.map((link, i) => (
              <input key={i} type="url" placeholder="https://..."
                value={link}
                onChange={(e) => setArrayField("external_links", i, e.target.value)}
                className={`${inputCls} mb-2`} />
            ))}
            <button type="button" onClick={() => addArrayField("external_links")}
              className="text-sm text-cyan hover:text-cyan-dark font-medium">
              + Add link
            </button>
          </Field>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-cyan hover:bg-cyan-dark text-near-black font-semibold px-6 py-2.5 rounded-[10px] transition-colors disabled:opacity-60">
              {saving ? "Saving…" : "Add Provider"}
            </button>
            <button type="button" onClick={() => router.back()}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-2.5 rounded-[10px] transition-colors">
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
