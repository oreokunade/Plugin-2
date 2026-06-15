"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db, DEV_MODE } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  CATEGORY_MAP,
  TEMPLATES,
  getTemplateForCategory,
  type TemplateSectionConfig,
} from "@/lib/templates";
import { validateFiles, hasContactInFilename } from "@/lib/imageProcessing";
import type { ContentBlock, TemplateType } from "@/lib/types";

// ─── Local types ──────────────────────────────────────────────────────────────

type UploadStep = "cover" | "details" | "review";

interface FilePreview {
  file: File;
  previewUrl: string;
}

interface SectionData {
  text?:     string;
  files?:    FilePreview[];
  videoUrl?: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router = useRouter();

  const [step,         setStep]         = useState<UploadStep>("cover");
  const [title,        setTitle]        = useState("");
  const [category,     setCategory]     = useState("");
  const [coverFile,    setCoverFile]    = useState<FilePreview | null>(null);
  const [templateType, setTemplateType] = useState<TemplateType>("image_portfolio");
  const [sections,     setSections]     = useState<Record<string, SectionData>>({});
  const [tags,         setTags]         = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  const template = TEMPLATES[templateType];

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function pickCategory(cat: string) {
    setCategory(cat);
    setTemplateType(getTemplateForCategory(cat).type);
    setSections({});
    setError("");
  }

  function setCoverFromInput(list: FileList | null) {
    if (!list?.[0]) return;
    const f = list[0];
    const v = validateFiles([f], "image");
    if (!v.valid) { setError(v.errors[0]); return; }
    setError("");
    setCoverFile({ file: f, previewUrl: URL.createObjectURL(f) });
  }

  function setSectionText(key: string, value: string) {
    setSections((p) => ({ ...p, [key]: { ...p[key], text: value } }));
  }

  function setSectionFiles(key: string, list: FileList | null, fileType: "image" | "video" | "any" = "image") {
    if (!list) return;
    const files = Array.from(list);
    const v     = validateFiles(files, fileType);
    if (!v.valid) { setError(v.errors[0]); return; }
    const flagged = files.find((f) => hasContactInFilename(f.name));
    if (flagged) { setError(`"${flagged.name}" may contain contact info. Rename it before uploading.`); return; }
    setError("");
    const previews = files.map((f) => ({ file: f, previewUrl: URL.createObjectURL(f) }));
    setSections((p) => ({ ...p, [key]: { ...p[key], files: previews } }));
  }

  function removeSectionFile(key: string, idx: number) {
    setSections((p) => {
      const files = p[key]?.files ?? [];
      return { ...p, [key]: { ...p[key], files: files.filter((_, i) => i !== idx) } };
    });
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  function validateCover() {
    if (!title.trim()) { setError("Give your project a title."); return false; }
    if (!category)     { setError("Select a category."); return false; }
    if (!coverFile)    { setError("Upload a cover image."); return false; }
    setError(""); return true;
  }

  function validateDetails() {
    for (const s of template.sections) {
      if (!s.required) continue;
      const d = sections[s.key];
      if ((s.inputType === "text" || s.inputType === "textarea") && !d?.text?.trim()) {
        setError(`"${s.label}" is required.`); return false;
      }
      if (s.inputType === "images" && !d?.files?.length) {
        setError(`Add at least one image for "${s.label}".`); return false;
      }
      if (s.inputType === "video" && !d?.files?.length && !d?.videoUrl?.trim()) {
        setError(`Add a video or link for "${s.label}".`); return false;
      }
      if (s.inputType === "before_after") {
        const beforeData = sections["before"];
        const afterData  = sections["after"];
        if (!beforeData?.files?.length || !afterData?.files?.length) {
          setError("Upload both Before and After images."); return false;
        }
      }
    }
    setError(""); return true;
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setLoading(true); setError("");
    try {
      const uid = DEV_MODE ? "dev-uid-001" : auth.currentUser?.uid;
      if (!uid) { setError("Session expired. Please sign in again."); setLoading(false); return; }

      // Build blocks from section data
      const blocks: ContentBlock[] = [];
      let   ocr_flagged            = false;

      // Handle before_after template specially (pair before/after sections)
      if (templateType === "before_after") {
        const beforeFiles = sections["before"]?.files ?? [];
        const afterFiles  = sections["after"]?.files  ?? [];
        if (beforeFiles.length && afterFiles.length) {
          const beforeUrls = DEV_MODE
            ? beforeFiles.map((_, i) => `/placeholder-before-${i + 1}.jpg`)
            : (await uploadFiles(beforeFiles.map((f) => f.file), uid)).urls;
          const afterUrls = DEV_MODE
            ? afterFiles.map((_, i) => `/placeholder-after-${i + 1}.jpg`)
            : (await uploadFiles(afterFiles.map((f) => f.file), uid)).urls;
          blocks.push({ type: "before_after", before: beforeUrls, after: afterUrls });
        }
        // Pick up any description section
        const desc = sections["description"]?.text?.trim();
        if (desc) blocks.push({ type: "text", label: "Description", content: desc });
      } else {
        // Process all other template sections in order
        for (const s of template.sections) {
          const d = sections[s.key];
          if (!d) continue;

          if ((s.inputType === "text" || s.inputType === "textarea" || s.inputType === "stat") && d.text?.trim()) {
            blocks.push({ type: s.inputType === "stat" ? "stat" : "text", label: s.label, content: d.text.trim() } as ContentBlock);
          }

          if (s.inputType === "images" && d.files?.length) {
            let urls: string[];
            if (DEV_MODE) {
              urls = d.files.map((_, i) => `/placeholder-${s.key}-${i + 1}.jpg`);
            } else {
              const res = await uploadFiles(d.files.map((f) => f.file), uid);
              urls = res.urls;
              if (res.ocr_flagged) ocr_flagged = true;
            }
            blocks.push({ type: "images", urls });
          }

          if (s.inputType === "video") {
            if (d.videoUrl?.trim()) {
              blocks.push({ type: "video", url: d.videoUrl.trim() });
            } else if (d.files?.length) {
              const url = DEV_MODE
                ? "/placeholder-video.mp4"
                : (await uploadFiles(d.files.map((f) => f.file), uid)).urls[0];
              if (url) blocks.push({ type: "video", url });
            }
          }
        }
      }

      // Upload cover image
      let coverUrl = "/placeholder-cover.jpg";
      if (!DEV_MODE && coverFile) {
        coverUrl = await uploadFile(coverFile.file, uid);
      }

      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);

      if (DEV_MODE) {
        console.log("[DEV MODE] Saving portfolio item:", { uid, title, category, templateType, blocks, tags: tagList });
        await new Promise((r) => setTimeout(r, 800)); // simulate save
        router.push("/dashboard?uploaded=true");
        return;
      }

      await addDoc(collection(db, "portfolio_items"), {
        provider_id:   uid,
        title:         title.trim(),
        cover_image:   coverUrl,
        template_type: templateType,
        blocks,
        category,
        tags:          tagList,
        status:        "pending",
        quality_tier:  "Bronze",
        ocr_flagged,
        admin_notes:   null,
        created_at:    serverTimestamp(),
        updated_at:    serverTimestamp(),
      });

      router.push("/dashboard?uploaded=true");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file: File, uid: string): Promise<string> {
    const r = await uploadFiles([file], uid);
    return r.urls[0];
  }

  async function uploadFiles(files: File[], uid: string): Promise<{ urls: string[]; ocr_flagged: boolean }> {
    const form = new FormData();
    form.append("uid", uid);
    files.forEach((f) => form.append("files", f));
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  }

  // ─── Progress ──────────────────────────────────────────────────────────────

  const stepIndex = step === "cover" ? 0 : step === "details" ? 1 : 2;
  const stepLabels = ["Cover", template.label, "Review"];

  function goBack() {
    if (step === "cover")   { router.back(); return; }
    if (step === "details") { setStep("cover"); return; }
    setStep("details");
  }

  function goNext() {
    if (step === "cover"   && validateCover())   { setStep("details"); return; }
    if (step === "details" && validateDetails())  { setStep("review");  return; }
    if (step === "review")                        { handleSubmit();     return; }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={goBack}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Step pills */}
          <div className="flex items-center gap-1.5 flex-1">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-all ${
                  i === stepIndex ? "bg-[#00EFFE]/15 text-[#0C5BEE]"
                  : i < stepIndex ? "text-gray-400"
                  : "text-gray-300"
                }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i < stepIndex  ? "bg-emerald-100 text-emerald-600"
                    : i === stepIndex ? "bg-[#00EFFE] text-[#0A0A0A]"
                    : "bg-gray-100 text-gray-400"
                  }`}>
                    {i < stepIndex ? "✓" : i + 1}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </div>
                {i < stepLabels.length - 1 && <div className={`w-4 h-px ${i < stepIndex ? "bg-emerald-300" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-28">

        {/* ── Step 1: Cover ───────────────────────────────────────────────── */}
        {step === "cover" && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display font-bold text-gray-900 text-xl mb-0.5">New project</h1>
              <p className="text-sm text-gray-500">Start with a strong cover image — it's the first thing clients see.</p>
            </div>

            {/* Cover image */}
            <Section label="Cover image" required hint="Best at 16:9 — landscape works well">
              <label className={`block rounded-2xl overflow-hidden cursor-pointer transition-all ${
                coverFile ? "ring-2 ring-[#00EFFE]/40" : "border-2 border-dashed border-gray-200 hover:border-[#00EFFE]/50"
              }`}>
                {coverFile ? (
                  <div className="relative aspect-video bg-gray-100 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverFile.previewUrl} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black/60 px-3 py-1.5 rounded-lg transition-opacity">
                        Change image
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-white flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 18h16.5M12 3v9m0 0l-3-3m3 3l3-3" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">Upload cover image</p>
                      <p className="text-xs text-gray-400 mt-0.5">JPG, PNG or WebP — max 20 MB</p>
                    </div>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFromInput(e.target.files)} />
              </label>
            </Section>

            {/* Title */}
            <Section label="Project title" required>
              <input
                type="text"
                placeholder="e.g. Brand identity for a Lagos fintech startup"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00EFFE]/40 focus:border-[#00EFFE] transition-all"
              />
            </Section>

            {/* Category */}
            <Section label="Category" required hint="Determines the format your project is presented in">
              <div className="flex flex-col gap-1.5">
                {CATEGORY_MAP.map(({ label, emoji }) => (
                  <button key={label} type="button" onClick={() => pickCategory(label)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium border text-left transition-all ${
                      category === label
                        ? "bg-[#00EFFE]/10 border-[#00EFFE]/50 text-[#0C5BEE]"
                        : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    }`}>
                    <span className="text-base leading-none flex-shrink-0">{emoji}</span>
                    <span className="leading-snug">{label}</span>
                    {category === label && (
                      <svg className="w-4 h-4 text-[#00EFFE] ml-auto flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              {category && (
                <div className="mt-3 flex items-center gap-3 bg-[#00EFFE]/8 border border-[#00EFFE]/30 rounded-xl px-4 py-3">
                  <span className="text-xl">{getTemplateForCategory(category).icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-[#0C5BEE]">{getTemplateForCategory(category).label} format</p>
                    <p className="text-xs text-[#0C5BEE]/70 mt-0.5">{getTemplateForCategory(category).description}</p>
                  </div>
                </div>
              )}
            </Section>

            {error && <ErrorMsg msg={error} />}
          </div>
        )}

        {/* ── Step 2: Template details ─────────────────────────────────────── */}
        {step === "details" && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display font-bold text-gray-900 text-xl mb-0.5">Project details</h1>
              <p className="text-sm text-gray-500">Fill in the sections below — the more context, the better clients can evaluate your work.</p>
            </div>

            {template.sections.map((s) => (
              <Section key={s.key} label={s.label} required={s.required} hint={s.hint}>
                <SectionInput
                  section={s}
                  data={sections[s.key]}
                  onText={(v)          => setSectionText(s.key, v)}
                  onFiles={(list, ft)  => setSectionFiles(s.key, list, ft)}
                  onVideoUrl={(v)      => setSections((p) => ({ ...p, [s.key]: { ...p[s.key], videoUrl: v } }))}
                  onRemove={(i)        => removeSectionFile(s.key, i)}
                />
              </Section>
            ))}

            <Section label="Tags" hint="Comma-separated — helps with search and matching">
              <input
                type="text"
                placeholder="e.g. rebrand, fintech, lagos, startup"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00EFFE]/40 focus:border-[#00EFFE] transition-all"
              />
            </Section>

            {/* Leak warning */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-amber-700 leading-relaxed">
                Make sure images don&apos;t contain your phone number, @handles, or watermarks — your work is shown <strong>anonymously</strong> to clients.
              </p>
            </div>

            {error && <ErrorMsg msg={error} />}
          </div>
        )}

        {/* ── Step 3: Review ──────────────────────────────────────────────── */}
        {step === "review" && (
          <div className="space-y-5">
            <div>
              <h1 className="font-display font-bold text-gray-900 text-xl mb-0.5">Review & submit</h1>
              <p className="text-sm text-gray-500">Check everything looks right before sending for review.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              {/* Cover preview */}
              {coverFile && (
                <div className="aspect-video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverFile.previewUrl} alt="Cover" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-5 space-y-4">
                {/* Title + meta */}
                <div>
                  <h2 className="font-display font-bold text-gray-900 text-base">{title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{category}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-blue-500 font-medium">{template.label}</span>
                  </div>
                </div>

                {/* Sections summary */}
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  {template.sections.map((s) => {
                    const d = sections[s.key];
                    if (!d) return null;
                    const hasContent = d.text?.trim() || d.files?.length || d.videoUrl?.trim();
                    if (!hasContent) return null;
                    return (
                      <div key={s.key} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00EFFE] mt-1.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{s.label}</p>
                          {d.text && <p className="text-xs text-gray-700 mt-0.5 line-clamp-2">{d.text}</p>}
                          {d.files?.length ? (
                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
                              {d.files.slice(0, 4).map((fp, i) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={i} src={fp.previewUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                              ))}
                              {d.files.length > 4 && <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500">+{d.files.length - 4}</div>}
                            </div>
                          ) : null}
                          {d.videoUrl && <p className="text-xs text-blue-500 mt-0.5 truncate">{d.videoUrl}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tags */}
                {tags && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-100 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-gray-500">Our team reviews all submissions before they go live — usually within 24 hours.</p>
            </div>

            {error && <ErrorMsg msg={error} />}
          </div>
        )}
      </main>

      {/* ── Sticky footer CTA ─────────────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-4 py-4 z-10">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={goNext}
            disabled={loading}
            className="w-full py-3.5 bg-[#00EFFE] hover:bg-[#00D4E0] disabled:opacity-50 text-[#0A0A0A] text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-[#0A0A0A]/20 border-t-[#0A0A0A] rounded-full animate-spin" /><span>Submitting…</span></>
            ) : step === "review" ? "Submit for review →" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2">
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
          {required && <span className="text-[#00EFFE] text-xs font-bold">*</span>}
        </div>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Template section input ───────────────────────────────────────────────────

function SectionInput({ section, data, onText, onFiles, onVideoUrl, onRemove }: {
  section:    TemplateSectionConfig;
  data?:      SectionData;
  onText:     (v: string) => void;
  onFiles:    (list: FileList | null, ft: "image" | "video" | "any") => void;
  onVideoUrl: (v: string) => void;
  onRemove:   (i: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const baseInput = "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00EFFE]/40 focus:border-[#00EFFE] transition-all";

  if (section.inputType === "text" || section.inputType === "textarea" || section.inputType === "stat") {
    return (
      <textarea
        rows={section.inputType === "textarea" ? 3 : 1}
        placeholder={section.placeholder}
        value={data?.text ?? ""}
        onChange={(e) => onText(e.target.value)}
        className={`${baseInput} resize-none`}
      />
    );
  }

  if (section.inputType === "images") {
    const files    = data?.files ?? [];
    const canAdd   = files.length < (section.maxImages ?? 8);
    return (
      <div className="space-y-3">
        {files.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {files.map((fp, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden group bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fp.previewUrl} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => onRemove(i)}
                  className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/60 rounded-full items-center justify-center hidden group-hover:flex">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        {canAdd && (
          <label className="flex items-center gap-3 bg-white border border-dashed border-gray-300 hover:border-[#00EFFE]/50 rounded-xl px-4 py-3.5 cursor-pointer transition-colors group">
            <div className="w-8 h-8 bg-gray-100 group-hover:bg-[#00EFFE]/10 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
              <svg className="w-4 h-4 text-gray-400 group-hover:text-[#00EFFE] transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                {files.length ? "Add more images" : "Upload images"}
              </p>
              <p className="text-xs text-gray-400">Up to {section.maxImages ?? 8} images · JPG, PNG, WebP</p>
            </div>
            <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => onFiles(e.target.files, "image")} />
          </label>
        )}
      </div>
    );
  }

  if (section.inputType === "video") {
    const videoFile = data?.files?.[0];
    return (
      <div className="space-y-3">
        <input type="url" placeholder="YouTube, Vimeo or Google Drive link"
          value={data?.videoUrl ?? ""}
          onChange={(e) => onVideoUrl(e.target.value)}
          className={baseInput}
        />
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or upload file</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <label className="flex items-center gap-3 bg-white border border-dashed border-gray-300 hover:border-[#00EFFE]/50 rounded-xl px-4 py-3.5 cursor-pointer transition-colors group">
          <div className="w-8 h-8 bg-gray-100 group-hover:bg-[#00EFFE]/10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
            <svg className="w-4 h-4 text-gray-400 group-hover:text-[#00EFFE] transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors truncate">
              {videoFile ? videoFile.file.name : "Upload video file"}
            </p>
            <p className="text-xs text-gray-400">MP4, MOV or WebM · max 20 MB</p>
          </div>
          <input type="file" accept="video/*" className="hidden" onChange={(e) => onFiles(e.target.files, "video")} />
        </label>
      </div>
    );
  }

  // before_after — rendered as two image sections (before + after)
  // The parent template has separate "before" and "after" section keys
  return null;
}

// ─── Error message ────────────────────────────────────────────────────────────

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3">
      <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <span className="text-red-600 text-xs leading-relaxed">{msg}</span>
    </div>
  );
}
