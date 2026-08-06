"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db, DEV_MODE } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import {
  CATEGORY_MAP,
  TEMPLATES,
  type TemplateSectionConfig,
} from "@/lib/templates";
import { validateFiles, hasContactInFilename } from "@/lib/imageProcessing";
import type { ContentBlock, TemplateType, TextStyleOptions } from "@/lib/types";
import ImageCropper from "@/components/ui/ImageCropper";
import { ImageBlockRenderer } from "@/components/ui/ImageBlockRenderer";
import { BlockRenderer } from "@/app/p/[uid]/PortfolioView";

// ─── Template type options ────────────────────────────────────────────────────

const TYPE_OPTIONS: {
  type: import("@/lib/types").TemplateType;
  label: string;
  description: string;
  bestFor: string;
  icon: React.ReactNode;
}[] = [
  {
    type: "image_portfolio",
    label: "Image Portfolio",
    description: "Let your visuals do the talking — upload a gallery of your best shots.",
    bestFor: "design work, branding, photography, creative outputs",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    type: "case_study",
    label: "Case Study",
    description: "Walk clients through the brief, your approach, and what you delivered.",
    bestFor: "marketing, dev projects, coaching, consulting",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
        <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
      </svg>
    ),
  },
  {
    type: "video_showcase",
    label: "Video Showcase",
    description: "Lead with a video or audio clip — paste a link or upload the file.",
    bestFor: "video editing, music production, motion graphics",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
      </svg>
    ),
  },
];

// ─── Local types ──────────────────────────────────────────────────────────────

type UploadStep = "type" | "cover" | "details" | "review";

interface FilePreview {
  file?: File; // optional because existing projects will only have previewUrl
  previewUrl: string;
  caption?: string;
}

type StoryBlockType = "text" | "media" | "video";
interface StoryBuilderBlock {
  id: string;
  type: StoryBlockType;
  text?: string;
  style?: TextStyleOptions;
  file?: FilePreview;
  videoUrl?: string;
}

interface SectionData {
  text?:     string;
  files?:    FilePreview[];
  videoUrl?: string;
  layout?:   "vertical" | "slideshow";
  spacing?:  number;
  storyBlocks?: StoryBuilderBlock[];
}

// --- Page ---------------------------------------------------------------------

function UploadPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [step,         setStep]         = useState<UploadStep>("type");
  const [title,        setTitle]        = useState("");
  const [category,     setCategory]     = useState("");
  const [coverFile,    setCoverFile]    = useState<FilePreview | null>(null);
  const [templateType, setTemplateType] = useState<TemplateType>("image_portfolio");
  const [defaultImageLayout, setDefaultImageLayout] = useState<"vertical" | "slideshow">("vertical");
  const [defaultImageSpacing, setDefaultImageSpacing] = useState<number>(12);
  const [sections,     setSections]     = useState<Record<string, SectionData>>({});
  const [tags,         setTags]         = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [cropTarget,   setCropTarget]   = useState<string | null>(null);

  const template = TEMPLATES[templateType];

  useEffect(() => {
    if (!editId) return;
    
    async function fetchEditItem() {
      setLoading(true);
      try {
        let data: any = null;
        if (DEV_MODE) {
          const stored = localStorage.getItem("dev_portfolio_items");
          if (stored) {
            const items = JSON.parse(stored);
            data = items.find((i: any) => i.id === editId);
          }
        } else {
          const docRef = doc(db, "portfolio_items", editId!);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            data = docSnap.data();
          }
        }
        
        if (data) {
          setTitle(data.title || "");
          setCategory(data.category || "");
          setTags((data.tags || []).join(", "));
          if (data.template_type) setTemplateType(data.template_type as TemplateType);
          if (data.cover_image) {
            setCoverFile({ previewUrl: data.cover_image });
          }
          if (data.raw_sections) {
            setSections(data.raw_sections);
          }
          // Default to the first step since they might want to review everything
          setStep("type");
        } else {
          setError("Project not found.");
        }
      } catch (e) {
        console.error("Error fetching project for edit:", e);
        setError("Could not load project for editing.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchEditItem();
  }, [editId]);

  // --- Helpers --------------------------------------------------------------

  function pickCategory(cat: string) {
    setCategory(cat);
    setError("");
  }

  function setCoverFromInput(list: FileList | null) {
    if (!list?.[0]) return;
    const f = list[0];
    const v = validateFiles([f], "image");
    if (!v.valid) { setError(v.errors[0]); return; }
    setError("");
    setCropTarget(URL.createObjectURL(f));
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

  function reorderSectionFile(key: string, from: number, to: number) {
    setSections((p) => {
      const files = [...(p[key]?.files ?? [])];
      if (from < 0 || from >= files.length || to < 0 || to >= files.length) return p;
      const [moved] = files.splice(from, 1);
      files.splice(to, 0, moved);
      return { ...p, [key]: { ...p[key], files } };
    });
  }

  function setSectionFileCaption(key: string, idx: number, caption: string) {
    setSections((p) => {
      const files = [...(p[key]?.files ?? [])];
      if (!files[idx]) return p;
      files[idx] = { ...files[idx], caption };
      return { ...p, [key]: { ...p[key], files } };
    });
  }

  function setStoryBlocks(key: string, updater: (prev: StoryBuilderBlock[]) => StoryBuilderBlock[]) {
    setSections((p) => {
      const current = p[key]?.storyBlocks ?? [];
      return { ...p, [key]: { ...p[key], storyBlocks: updater(current) } };
    });
  }

  // --- Validation ------------------------------------------------------------

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  function validateCover() {
    const missing: string[] = [];
    if (!title.trim()) missing.push("Give your project a title.");
    if (!category)     missing.push("Select a category.");
    if (!coverFile)    missing.push("Upload a cover image.");
    if (missing.length === 0) { setError(""); return true; }
    setError(missing.length === 1 ? missing[0] : "Please fill in all required fields before continuing.");
    scrollToTop();
    return false;
  }

  function validateDetails() {
    const missing: string[] = [];
    for (const s of template.sections) {
      if (!s.required) continue;
      const d = sections[s.key];
      if ((s.inputType === "text" || s.inputType === "textarea") && !d?.text?.trim()) {
        missing.push(`"${s.label}" is required.`);
      }
      if (s.inputType === "images" && !d?.files?.length) {
        missing.push(`Add at least one image for "${s.label}".`);
      }
      if (s.inputType === "video" && !d?.files?.length && !d?.videoUrl?.trim()) {
        missing.push(`Add a video or link for "${s.label}".`);
      }
      if (s.inputType === "story_builder" && (!d?.storyBlocks || d.storyBlocks.length === 0)) {
        missing.push(`Add at least one block to "${s.label}".`);
      }
    }
    if (missing.length === 0) { setError(""); return true; }
    setError(missing.length === 1 ? missing[0] : "Please fill in all required fields before continuing.");
    scrollToTop();
    return false;
  }

  function getPreviewBlocks(): ContentBlock[] {
    const blocks: ContentBlock[] = [];
    for (const s of template.sections) {
      const d = sections[s.key];
      if (!d) continue;

      if ((s.inputType === "text" || s.inputType === "textarea" || s.inputType === "stat") && d.text?.trim()) {
        blocks.push({ type: s.inputType === "stat" ? "stat" : "text", label: s.label, content: d.text.trim() } as ContentBlock);
      }

      if (s.inputType === "images" && d.files?.length) {
        const urls = d.files.map((f) => f.previewUrl);
        const captions = d.files.map((f) => f.caption || "");
        blocks.push({ type: "images", urls, captions, layout: d.layout ?? defaultImageLayout, spacing: defaultImageSpacing });
      }

      if (s.inputType === "video") {
        if (d.videoUrl?.trim()) {
          blocks.push({ type: "video", url: d.videoUrl.trim() });
        } else if (d.files?.length) {
          blocks.push({ type: "video", url: d.files[0].previewUrl });
        }
      }

      if (s.inputType === "story_builder" && d.storyBlocks?.length) {
        for (const sb of d.storyBlocks) {
          if (sb.type === "text" && sb.text?.trim()) {
            blocks.push({ type: "text", label: "Story", content: sb.text.trim(), style: sb.style } as ContentBlock);
          }
          if (sb.type === "video" && sb.videoUrl?.trim()) {
            blocks.push({ type: "video", url: sb.videoUrl.trim() });
          }
          if (sb.type === "media" && sb.file) {
            const url = sb.file.previewUrl;
            // Simple heuristic to match what handleSubmit does
            const isVideo = sb.file.file ? sb.file.file.type.startsWith("video/") : url.match(/\.(mp4|webm|mov)(\?.*)?$/i);
            if (isVideo) {
              blocks.push({ type: "video", url });
            } else {
              blocks.push({ type: "images", urls: [url], layout: "vertical", spacing: defaultImageSpacing });
            }
          }
        }
      }
    }
    return blocks;
  }

  // --- Submit ----------------------------------------------------------------

  async function handleSubmit() {
    setLoading(true); setError("");
    try {
      const uid = DEV_MODE ? "dev-uid-001" : auth.currentUser?.uid;
      if (!uid) { setError("Session expired. Please sign in again."); setLoading(false); return; }

      // Build blocks from section data
      const blocks: ContentBlock[] = [];
      let   ocr_flagged            = false;

      // Process each template section in order
      for (const s of template.sections) {
        const d = sections[s.key];
        if (!d) continue;

        if ((s.inputType === "text" || s.inputType === "textarea" || s.inputType === "stat") && d.text?.trim()) {
          blocks.push({ type: s.inputType === "stat" ? "stat" : "text", label: s.label, content: d.text.trim() } as ContentBlock);
        }

        if (s.inputType === "images" && d.files?.length) {
          let urls: string[];
          let captions: string[] = [];
          if (DEV_MODE) {
            urls = d.files.map((f, i) => f.file ? `/placeholder-${s.key}-${i + 1}.jpg` : f.previewUrl);
            captions = d.files.map((f) => f.caption || "");
          } else {
            const filesToUpload = d.files.filter((f) => f.file).map((f) => f.file as File);
            let uploadedUrls: string[] = [];
            if (filesToUpload.length > 0) {
              const res = await uploadFiles(filesToUpload, uid);
              uploadedUrls = res.urls;
              if (res.ocr_flagged) ocr_flagged = true;
            }
            let uploadIdx = 0;
            urls = d.files.map((f) => f.file ? uploadedUrls[uploadIdx++] : f.previewUrl);
            captions = d.files.map((f) => f.caption || "");
          }
          blocks.push({ type: "images", urls, captions, layout: d.layout ?? defaultImageLayout, spacing: defaultImageSpacing });
        }

        if (s.inputType === "video") {
          if (d.videoUrl?.trim()) {
            blocks.push({ type: "video", url: d.videoUrl.trim() });
          } else if (d.files?.length) {
            const f = d.files[0];
            let url = f.previewUrl;
            if (f.file) {
              url = DEV_MODE
                ? "/placeholder-video.mp4"
                : (await uploadFiles([f.file], uid)).urls[0];
            }
            if (url) blocks.push({ type: "video", url });
          }
        }

        if (s.inputType === "story_builder" && d.storyBlocks?.length) {
          for (const sb of d.storyBlocks) {
            if (sb.type === "text" && sb.text?.trim()) {
              blocks.push({ type: "text", label: "Story", content: sb.text.trim(), style: sb.style } as ContentBlock);
            }
            if (sb.type === "video" && sb.videoUrl?.trim()) {
              blocks.push({ type: "video", url: sb.videoUrl.trim() });
            }
          if (sb.type === "media" && sb.file) {
            const f = sb.file.file;
            let url = sb.file.previewUrl;
            if (f) {
              if (DEV_MODE) {
                if (f.type.startsWith("video/")) {
                  url = "/placeholder-video.mp4";
                } else {
                  url = await new Promise<string>((res) => {
                    const reader = new FileReader();
                    reader.onload = () => res(reader.result as string);
                    reader.readAsDataURL(f);
                  });
                }
              } else {
                const res = await uploadFiles([f], uid);
                url = res.urls[0];
                if (res.ocr_flagged) ocr_flagged = true;
              }
            }
            if (url) {
              // Note: If f is undefined, we assume it's from edit hydration. 
              // We check if url ends with mp4 or sb.file indicates a video to differentiate.
              // We'll use a simple heuristic: if it contains 'video' or ends with mp4/webm, it's video
              const isVideo = f ? f.type.startsWith("video/") : url.match(/\.(mp4|webm|mov)(\?.*)?$/i);
              
              if (isVideo) {
                blocks.push({ type: "video", url });
              } else {
                blocks.push({ type: "images", urls: [url], layout: "vertical", spacing: defaultImageSpacing });
              }
            }
          }
            }
          }
        }

      // Upload cover image
      let coverUrl = "/mock/cover-fintech.svg";
      if (!DEV_MODE && coverFile) {
        if (coverFile.file) {
          coverUrl = await uploadFile(coverFile.file, uid);
        } else {
          coverUrl = coverFile.previewUrl;
        }
      }

      const fileToBase64 = (f: File) => new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.readAsDataURL(f);
      });

      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);

      if (DEV_MODE) {
        console.log("[DEV MODE] Saving portfolio item:", { uid, title, category, templateType, blocks, tags: tagList });
        let devCover = "/mock/cover-fintech.svg";
        if (coverFile) {
          if (coverFile.file) {
            devCover = await fileToBase64(coverFile.file);
          } else {
            devCover = coverFile.previewUrl;
          }
        }
        
        const itemData = {
          provider_id: uid,
          title,
          category,
          template_type: templateType,
          blocks,
          tags: tagList,
          status: "pending",
          quality_tier: "Silver",
          cover_image: devCover,
          raw_sections: sections,
          updated_at: new Date().toISOString()
        };

        const saveToDev = (finalCover: string) => {
          itemData.cover_image = finalCover;
          const existingStr = localStorage.getItem("dev_portfolio_items");
          const existing = existingStr ? JSON.parse(existingStr) : [];
          if (editId) {
            const idx = existing.findIndex((i: any) => i.id === editId);
            if (idx > -1) {
              existing[idx] = { ...existing[idx], ...itemData };
            } else {
              existing.unshift({ id: editId, created_at: new Date().toISOString(), ...itemData });
            }
          } else {
            existing.unshift({ id: `dev-${Date.now()}`, created_at: new Date().toISOString(), ...itemData });
          }
          localStorage.setItem("dev_portfolio_items", JSON.stringify(existing));
        };

        try {
          saveToDev(devCover);
        } catch (e) {
          console.warn("Local storage full, falling back to placeholder cover image to save space.");
          saveToDev("/mock/cover-fintech.svg");
        }
        router.push("/dashboard?uploaded=true");
        return;
      }

      const docData = {
        title:         title.trim(),
        cover_image:   coverFile && !DEV_MODE && coverFile.file ? coverUrl : (coverFile?.previewUrl || "/mock/cover-fintech.svg"),
        template_type: templateType,
        blocks,
        category,
        tags:          tagList,
        status:        "pending",
        raw_sections:  sections,
        ocr_flagged,
        admin_notes:   null,
        updated_at:    serverTimestamp(),
      };

      if (editId) {
        await updateDoc(doc(db, "portfolio_items", editId), docData);
      } else {
        await addDoc(collection(db, "portfolio_items"), {
          ...docData,
          provider_id:   uid,
          quality_tier:  "Bronze",
          created_at:    serverTimestamp(),
        });
      }

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

  // --- Progress --------------------------------------------------------------

  const stepIndex  = step === "type" ? 0 : step === "cover" ? 1 : step === "details" ? 2 : 3;
  const stepLabels = ["Type", "Cover", "Details", "Review"];

  function goBack() {
    if (step === "type")    { router.back();       return; }
    if (step === "cover")   { setError(""); setStep("type");     return; }
    if (step === "details") { setError(""); setStep("cover");    return; }
    setError(""); setStep("details");
  }

  function goNext() {
    if (step === "type") {
      setError(""); setStep("cover"); return;
    }
    if (step === "cover"   && validateCover())   { setStep("details"); return; }
    if (step === "details" && validateDetails()) { setStep("review");  return; }
    if (step === "review")                       { handleSubmit();     return; }
  }

  const previewBlocks = getPreviewBlocks();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Lora:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* --- Header ---------------------------------------------------------- */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={goBack}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Step pills */}
          <div className="flex items-center justify-center flex-1 pr-8">
            <div className="flex items-center relative">
              {stepLabels.map((label, i) => {
                const isActive = i === stepIndex;
                const isPast = i < stepIndex;
                
                return (
                  <div key={label} className="flex items-center">
                    <div className="flex items-center relative group">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold transition-all duration-300 z-10 ${
                        isPast ? "bg-emerald-100 text-emerald-600 shadow-sm"
                        : isActive ? "bg-[#00EFFE] text-[#0D5C6F] shadow-md ring-4 ring-[#00EFFE]/20"
                        : "bg-white text-gray-400 ring-1 ring-gray-200"
                      }`}>
                        {isPast ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                            <path d="M5 13l4 4L19 7"/>
                          </svg>
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span className={`ml-2 text-[13px] font-semibold transition-colors duration-300 hidden sm:block ${
                        isActive ? "text-gray-900" : isPast ? "text-gray-700" : "text-gray-400"
                      }`}>
                        {label}
                      </span>
                    </div>

                    {/* Connecting line */}
                    {i < stepLabels.length - 1 && (
                      <div className="w-8 sm:w-12 h-[2px] mx-2 sm:mx-3 rounded-full overflow-hidden bg-gray-100 flex">
                        <div className={`h-full transition-all duration-500 ${isPast ? "w-full bg-emerald-400" : "w-0 bg-emerald-400"}`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* --- Content --------------------------------------------------------- */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-28">

        {/* --- Step 0: Type selection ----------------------------------------- */}
        {step === "type" && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display font-bold text-gray-900 text-xl mb-0.5">What kind of project is this?</h1>
              <p className="text-sm text-gray-500">Pick the format that best shows off this piece of work.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TYPE_OPTIONS.map((opt) => {
                const active = templateType === opt.type;
                return (
                  <button key={opt.type} type="button"
                    onClick={() => { setTemplateType(opt.type); setSections({}); }}
                    className={`relative text-left rounded-2xl p-5 border-2 transition-all group ${
                      active
                        ? "border-[#00EFFE] bg-[#00EFFE]/5"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                    }`}>
                    {active && (
                      <span className="absolute top-3 right-3 w-5 h-5 bg-[#00EFFE] rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-[#0A0A0A]" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                      active ? "bg-[#00EFFE]/15 text-[#0C5BEE]" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                    }`}>
                      {opt.icon}
                    </div>
                    <p className={`font-display font-bold text-sm mb-1 ${active ? "text-[#0C5BEE]" : "text-gray-900"}`}>{opt.label}</p>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3">{opt.description}</p>
                    <p className={`text-[11px] font-medium ${active ? "text-[#0C5BEE]/70" : "text-gray-400"}`}>
                      Best for: {opt.bestFor}
                    </p>
                  </button>
                );
              })}
            </div>

            {templateType === "image_portfolio" && (
              <div className="animate-fade-in mt-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-px bg-gray-200 flex-1" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Project Settings</span>
                  <div className="h-px bg-gray-200 flex-1" />
                </div>
                <div className="p-5 bg-white border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl flex flex-col gap-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                  <div>
                    <h3 className="font-display font-semibold text-gray-900 mb-1">How should we display your images?</h3>
                    <p className="text-sm text-gray-500">You can change this later on the details step.</p>
                  </div>
                  <div className="flex bg-gray-100 p-1 rounded-lg flex-shrink-0">
                    <button 
                      onClick={() => setDefaultImageLayout("vertical")}
                      className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${defaultImageLayout === "vertical" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                      Vertical scroll
                    </button>
                    <button 
                      onClick={() => setDefaultImageLayout("slideshow")}
                      className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${defaultImageLayout === "slideshow" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                      Slideshow
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        )}

        {/* --- Step 1: Cover & Info ------------------------------------------- */}
        {step === "cover" && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display font-bold text-gray-900 text-xl mb-0.5">New project</h1>
              <p className="text-sm text-gray-500">Start with a strong cover image — it's the first thing clients see.</p>
            </div>

            {/* Cover image */}
            <Section label="Cover image" required hint="Best at 16:9 (e.g. 1920x1080px) — landscape works well">
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

            {error && <ErrorMsg msg={error} />}

            {/* Title */}
            <Section label="Project title" required>
              <input
                type="text"
                placeholder="e.g. Brand identity for a Lagos fintech startup"
                value={title}
                onChange={(e) => { setTitle(e.target.value); if (error) setError(""); }}
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
                <div className="mt-3 flex items-center gap-2 bg-[#00EFFE]/8 border border-[#00EFFE]/30 rounded-xl px-4 py-2.5">
                  <svg className="w-3.5 h-3.5 text-[#00EFFE] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-[#0C5BEE] font-medium">{category}</p>
                </div>
              )}
            </Section>

          </div>
        )}

        {/* --- Step 2: Template details --------------------------------------- */}
        {step === "details" && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display font-bold text-gray-900 text-xl mb-0.5">Project details</h1>
              <p className="text-sm text-gray-500">Fill in the sections below — the more context, the better clients can evaluate your work.</p>
            </div>

            {error && <ErrorMsg msg={error} />}

            {/* Leak warning */}
            <div className="relative overflow-hidden bg-amber-50/50 border border-amber-200/50 rounded-xl px-4 py-3 flex items-start gap-3">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 blur-3xl rounded-full -mr-8 -mt-8 pointer-events-none" />
              <div className="relative w-8 h-8 rounded-lg bg-white shadow-sm border border-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="relative flex-1">
                <h3 className="text-sm font-semibold text-amber-900 mb-0.5">Keep it anonymous</h3>
                <p className="text-sm text-amber-700/80 leading-relaxed">
                  Make sure images don't contain your phone number, @handles, or watermarks. Your work is shown anonymously to clients.
                </p>
              </div>
            </div>

            <Section label="Tags" hint="Comma-separated — helps with search and matching">
              <input
                type="text"
                placeholder="e.g. rebrand, fintech, lagos, startup"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00EFFE]/40 focus:border-[#00EFFE] transition-all"
              />
            </Section>

            {template.sections.map((s) => (
              <Section key={s.key} label={s.label} required={s.required} hint={s.hint}>
                <SectionInput
                  section={s}
                  data={sections[s.key]}
                  defaultImageLayout={defaultImageLayout}
                  defaultImageSpacing={defaultImageSpacing}
                  onText={(v)          => setSectionText(s.key, v)}
                  onFiles={(list, ft)  => setSectionFiles(s.key, list, ft)}
                  onVideoUrl={(v)      => setSections((p) => ({ ...p, [s.key]: { ...p[s.key], videoUrl: v } }))}
                  onRemove={(i)        => removeSectionFile(s.key, i)}
                  onReorder={(from, to) => reorderSectionFile(s.key, from, to)}
                  onCaptionChange={(idx, text) => setSectionFileCaption(s.key, idx, text)}
                  onLayoutChange={(layout) => setSections((p) => ({ ...p, [s.key]: { ...p[s.key], layout } }))}
                  onSpacingChange={(spacing) => setSections((p) => ({ ...p, [s.key]: { ...p[s.key], spacing } }))}
                  onStoryBlocksChange={(updater) => setStoryBlocks(s.key, updater)}
                />
              </Section>
            ))}
          </div>
        )}

        {/* --- Step 3: Review ------------------------------------------------ */}
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

                {/* Tags */}
                {tags && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{t}</span>
                    ))}
                  </div>
                )}

                {/* Rendered Preview Blocks */}
                {previewBlocks.length > 0 && (
                  <div className="border-t border-gray-100 pt-6 space-y-6">
                    {previewBlocks.map((block, i) => (
                      <BlockRenderer key={i} block={block} />
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

      {/* Cropper Modal */}
      {cropTarget && (
        <ImageCropper
          imageSrc={cropTarget}
          onCancel={() => setCropTarget(null)}
          onCropComplete={(file) => {
            setCoverFile({ file, previewUrl: URL.createObjectURL(file) });
            setCropTarget(null);
          }}
        />
      )}

      {/* --- Sticky footer CTA ----------------------------------------------- */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-4 py-4 z-10">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={goNext}
            disabled={loading}
            className="w-full py-3.5 bg-[#00EFFE] hover:bg-[#00D4E0] disabled:opacity-50 text-[#0A0A0A] text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-[#0A0A0A]/20 border-t-[#0A0A0A] rounded-full animate-spin" /><span>Submitting…</span></>
            ) : step === "review" ? "Submit for review" : step === "type" ? "Use this format" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500 font-medium">Loading editor...</div>}>
      <UploadPageContent />
    </Suspense>
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

// ─── Text block builder ─────────────────────────────────────────────────────────

const TEXT_FONTS = [
  { value: "Inter", label: "Inter" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Roboto", label: "Roboto" },
  { value: "Outfit", label: "Outfit" },
  { value: "DM Sans", label: "DM Sans" },
  { value: "Space Grotesk", label: "Space Grotesk" },
  { value: "Lora", label: "Lora" },
  { value: "Poppins", label: "Poppins" },
];

const TEXT_SIZES: { value: string; label: string; px: string }[] = [
  { value: "sm", label: "S", px: "14px" },
  { value: "base", label: "M", px: "16px" },
  { value: "lg", label: "L", px: "18px" },
  { value: "xl", label: "XL", px: "20px" },
  { value: "2xl", label: "2X", px: "24px" },
  { value: "3xl", label: "3X", px: "30px" },
];

const TEXT_COLORS = [
  "#111827", "#374151", "#6B7280", "#1E40AF", "#7C3AED",
  "#DC2626", "#EA580C", "#059669", "#0891B2", "#DB2777",
];

const TEXT_WIDTHS: { value: string; label: string; icon: string }[] = [
  { value: "narrow", label: "Narrow", icon: "┃  ┃" },
  { value: "base", label: "Standard", icon: "┃    ┃" },
  { value: "wide", label: "Wide", icon: "┃      ┃" },
  { value: "full", label: "Full", icon: "┃        ┃" },
];

function getStyleValues(s: import("@/lib/types").TextStyleOptions) {
  return {
    fontFamily: s.fontFamily ? `'${s.fontFamily}', sans-serif` : "'Inter', sans-serif",
    fontSize: s.size === "sm" ? "0.875rem" : s.size === "lg" ? "1.125rem" : s.size === "xl" ? "1.25rem" : s.size === "2xl" ? "1.5rem" : s.size === "3xl" ? "1.875rem" : "1rem",
    fontWeight: s.weight === "bold" ? 700 : s.weight === "semibold" ? 600 : s.weight === "medium" ? 500 : 400,
    color: s.color ?? "#111827",
  };
}

function TextBuilderBlock({ block, onChange }: { block: StoryBuilderBlock; onChange: (block: StoryBuilderBlock) => void }) {
  const [isEditing, setIsEditing] = useState(!block.text);
  const [showColors, setShowColors] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const style = block.style ?? {};
  const computed = getStyleValues(style);

  const updateStyle = (key: keyof import("@/lib/types").TextStyleOptions, val: any) => {
    onChange({ ...block, style: { ...style, [key]: val } });
  };

  const execFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    // Save content after formatting
    if (editorRef.current) {
      onChange({ ...block, text: editorRef.current.innerHTML });
    }
  };

  const handleDone = () => {
    if (editorRef.current) {
      onChange({ ...block, text: editorRef.current.innerHTML });
    }
    setIsEditing(false);
  };

  // Set initial content once when entering edit mode — avoids cursor reset from dangerouslySetInnerHTML
  useEffect(() => {
    if (isEditing && editorRef.current && block.text) {
      editorRef.current.innerHTML = block.text;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  return (
    <div className="flex flex-col w-full">
      {isEditing ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {/* ── Row 1: Font + Size ────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2 px-3 pt-3 pb-2">
            {/* Font family */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Font</span>
              <select
                value={style.fontFamily ?? "Inter"}
                onChange={(e) => updateStyle("fontFamily", e.target.value)}
                className="text-sm font-medium bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-[#00EFFE]/30 focus:border-[#00EFFE] appearance-auto min-w-[140px] text-gray-800"
                style={{ fontFamily: `'${style.fontFamily ?? "Inter"}', sans-serif` }}
              >
                {TEXT_FONTS.map((f) => (
                  <option key={f.value} value={f.value} style={{ fontFamily: `'${f.value}', sans-serif` }}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Size pills */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Size</span>
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                {TEXT_SIZES.map((sz) => (
                  <button
                    key={sz.value}
                    type="button"
                    onClick={() => updateStyle("size", sz.value)}
                    className={`px-2.5 py-2 text-xs font-semibold transition-all ${
                      (style.size ?? "base") === sz.value
                        ? "bg-gray-900 text-white"
                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                    }`}
                    title={sz.px}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Weight */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Weight</span>
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                {(["normal", "medium", "semibold", "bold"] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => updateStyle("weight", w)}
                    className={`px-2.5 py-2 text-xs transition-all ${(style.weight ?? "normal") === w ? "bg-gray-900 text-white font-semibold" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}
                    style={{ fontWeight: w === "normal" ? 400 : w === "medium" ? 500 : w === "semibold" ? 600 : 700 }}
                  >
                    {w.charAt(0).toUpperCase() + w.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Done button */}
            <div className="ml-auto self-end">
              <button
                type="button"
                onClick={handleDone}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Done
              </button>
            </div>
          </div>

          {/* ── Row 2: Inline formatting controls ────────────── */}
          <div className="flex flex-wrap items-center gap-1 px-3 pb-2.5 border-b border-gray-100">
            {/* Bold (inline) */}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); execFormat("bold"); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all text-gray-500 hover:bg-gray-100 hover:text-gray-800 active:bg-gray-900 active:text-white"
              title="Bold selected text (Ctrl+B)"
            >
              <span className="font-bold text-[13px]">B</span>
            </button>

            {/* Underline (inline) */}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); execFormat("underline"); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all text-gray-500 hover:bg-gray-100 hover:text-gray-800 active:bg-gray-900 active:text-white"
              title="Underline selected text (Ctrl+U)"
            >
              <span className="underline text-[13px]">U</span>
            </button>

            {/* Italic (inline) */}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); execFormat("italic"); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all text-gray-500 hover:bg-gray-100 hover:text-gray-800 active:bg-gray-900 active:text-white"
              title="Italic selected text (Ctrl+I)"
            >
              <span className="italic text-[13px]">I</span>
            </button>

            <div className="w-px h-5 bg-gray-200 mx-1.5" />

            {/* Color swatches (block-level) */}
            <div className="relative flex items-center gap-1">
              {TEXT_COLORS.slice(0, 5).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateStyle("color", c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                    (style.color ?? "#111827") === c ? "border-[#00EFFE] ring-2 ring-[#00EFFE]/30 scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              <button
                type="button"
                onClick={() => setShowColors(!showColors)}
                className="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors text-xs"
                title="More colors"
              >
                +
              </button>

              {showColors && (
                <div className="absolute top-9 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-3 flex flex-col gap-2.5 min-w-[200px]">
                  <div className="flex flex-wrap gap-1.5">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { updateStyle("color", c); setShowColors(false); }}
                        className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${
                          (style.color ?? "#111827") === c ? "border-[#00EFFE] ring-2 ring-[#00EFFE]/30" : "border-gray-100"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase">Custom</span>
                    <input
                      type="color"
                      value={style.color ?? "#111827"}
                      onChange={(e) => updateStyle("color", e.target.value)}
                      className="w-7 h-7 p-0.5 border border-gray-200 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs text-gray-500 font-mono">{style.color ?? "#111827"}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-gray-200 mx-1.5" />

            {/* Width */}
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
              {TEXT_WIDTHS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => updateStyle("width", w.value)}
                  className={`px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-all ${
                    (style.width ?? "base") === w.value
                      ? "bg-gray-900 text-white"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  }`}
                  title={w.label}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Content editable area ────────────────────────── */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={() => {
              if (editorRef.current) {
                onChange({ ...block, text: editorRef.current.innerHTML });
              }
            }}
            className="w-full px-4 py-4 min-h-[140px] focus:outline-none bg-white [&:empty]:before:content-['Start_writing...'] [&:empty]:before:text-gray-300 [&>div]:m-0 [&>p]:m-0 [&>div]:leading-[1.75] [&>p]:leading-[1.75]"
            style={{ ...computed, lineHeight: 1.75 }}
          />
        </div>
      ) : (
        <div
          className="relative group/preview border border-transparent hover:border-gray-200 rounded-xl p-4 transition-all cursor-pointer hover:bg-gray-50/50"
          onClick={() => setIsEditing(true)}
        >
          <div className="absolute top-2 right-2 opacity-0 group-hover/preview:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 shadow-sm rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
              Edit
            </button>
          </div>
          <div
            className={`mx-auto ${
              style.width === "narrow" ? "max-w-2xl" : style.width === "wide" ? "max-w-4xl" : style.width === "full" ? "max-w-none" : "max-w-3xl"
            }`}
            style={computed}
          >
            {block.text ? (
              <div dangerouslySetInnerHTML={{ __html: block.text }} className="[&>div]:m-0 [&>p]:m-0 [&>div]:leading-[1.75] [&>p]:leading-[1.75]" style={{ lineHeight: 1.75 }} />
            ) : (
              <span className="text-gray-400 italic" style={{ fontWeight: 400, textDecoration: "none" }}>Click to add text…</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Template section input ───────────────────────────────────────────────────

function SectionInput({ section, data, defaultImageLayout = "vertical", defaultImageSpacing = 12, onText, onFiles, onVideoUrl, onRemove, onReorder, onCaptionChange, onLayoutChange, onSpacingChange, onStoryBlocksChange }: {
  section:    TemplateSectionConfig;
  data?:      SectionData;
  defaultImageLayout?: "vertical" | "slideshow";
  defaultImageSpacing?: number;
  onText:     (v: string) => void;
  onFiles:    (list: FileList | null, ft: "image" | "video" | "any") => void;
  onVideoUrl: (v: string) => void;
  onRemove:   (i: number) => void;
  onReorder?: (from: number, to: number) => void;
  onCaptionChange?: (idx: number, text: string) => void;
  onLayoutChange?: (layout: "vertical" | "slideshow") => void;
  onSpacingChange?: (spacing: number) => void;
  onStoryBlocksChange?: (updater: (prev: StoryBuilderBlock[]) => StoryBuilderBlock[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeCaptions, setActiveCaptions] = useState<Record<number, boolean>>({});
  const [activeSlide, setActiveSlide] = useState(0);

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
    const layout   = data?.layout ?? defaultImageLayout;
    const spacing  = data?.spacing ?? defaultImageSpacing;
    return (
      <div className="space-y-4">
        {files.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Display mode:</span>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={() => onLayoutChange?.("vertical")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${layout === "vertical" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  Vertical
                </button>
                <button 
                  onClick={() => onLayoutChange?.("slideshow")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${layout === "slideshow" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  Slideshow
                </button>
              </div>
            </div>
            
            {layout === "vertical" && (
              <div className="flex items-center gap-2 pl-0 sm:pl-4 sm:border-l border-gray-100">
                <span className="text-xs text-gray-500 font-medium">Spacing:</span>
                <span className="text-xs font-semibold text-gray-900 w-6">{spacing}px</span>
                <input 
                  type="range" 
                  min="0" 
                  max="12" 
                  value={spacing} 
                  onChange={(e) => onSpacingChange?.(Number(e.target.value))}
                  className="w-24 sm:w-32 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00EFFE]"
                />
              </div>
            )}
          </div>
        )}
        {files.length > 0 && (
          <div className="flex flex-col" style={{ gap: `${layout === "vertical" ? spacing : 24}px` }}>
            {files.map((fp, i) => {
              const currentIndex = Math.min(activeSlide, Math.max(0, files.length - 1));
              if (layout === "slideshow" && i !== currentIndex) return null;
              
              const showCaption = (fp.caption && fp.caption.trim().length > 0) || activeCaptions[i];
              return (
                <div key={i} className="flex flex-col gap-2.5">
                  <div className={`relative w-full rounded-2xl overflow-hidden group bg-gray-100 border border-gray-200 flex items-center justify-center ${layout === "slideshow" ? "aspect-video" : ""}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fp.previewUrl} alt="" className={layout === "slideshow" ? "w-full h-full object-contain" : "w-full h-auto max-h-[800px] object-contain"} />
                    
                    {layout === "slideshow" && files.length > 1 && (
                      <>
                        <button type="button"
                          onClick={() => setActiveSlide((c) => (c === 0 ? files.length - 1 : c - 1))}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm backdrop-blur-md z-10">
                          <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                          </svg>
                        </button>
                        <button type="button"
                          onClick={() => setActiveSlide((c) => (c === files.length - 1 ? 0 : c + 1))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm backdrop-blur-md z-10">
                          <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                      </>
                    )}

                    <div className="absolute inset-x-2 top-2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <div className="flex gap-1.5">
                        {onReorder && i > 0 && (
                          <button type="button" onClick={() => { onReorder(i, i - 1); if (layout === "slideshow") setActiveSlide(i - 1); }}
                            className="w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors shadow-sm backdrop-blur-md" title="Move up">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            </svg>
                          </button>
                        )}
                        {onReorder && i < files.length - 1 && (
                          <button type="button" onClick={() => { onReorder(i, i + 1); if (layout === "slideshow") setActiveSlide(i + 1); }}
                            className="w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors shadow-sm backdrop-blur-md" title="Move down">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                          </button>
                        )}
                        {!showCaption && onCaptionChange && (
                          <button type="button" onClick={(e) => { 
                            e.preventDefault(); 
                            e.stopPropagation(); 
                            setActiveCaptions(prev => ({ ...prev, [i]: true })); 
                            setTimeout(() => {
                              document.getElementById(`caption-input-${section.key}-${i}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                            }, 50);
                          }}
                            className="h-8 px-2.5 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors shadow-sm backdrop-blur-md text-white text-xs font-medium gap-1" title="Add caption">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Caption
                          </button>
                        )}
                      </div>
                      <button type="button" onClick={() => onRemove(i)}
                        className="w-8 h-8 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors shadow-sm backdrop-blur-md" title="Remove">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {layout === "slideshow" && files.length > 1 && (
                    <div className="relative group/strip mt-2">
                      <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-thin pr-10">
                        {files.map((f, dotIdx) => (
                          <div 
                            key={dotIdx}
                            draggable
                            onDragStart={(e) => { e.dataTransfer.setData("idx", dotIdx.toString()); }}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-[#00EFFE]", "scale-105"); }}
                            onDragLeave={(e) => { e.currentTarget.classList.remove("border-[#00EFFE]", "scale-105"); }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.remove("border-[#00EFFE]", "scale-105");
                              const fromIdx = parseInt(e.dataTransfer.getData("idx"));
                              if (!isNaN(fromIdx) && fromIdx !== dotIdx) {
                                onReorder?.(fromIdx, dotIdx);
                                setActiveSlide(dotIdx);
                              }
                            }}
                            onClick={() => setActiveSlide(dotIdx)}
                            className={`relative w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${dotIdx === currentIndex ? "border-[#00EFFE] opacity-100" : "border-transparent opacity-50 hover:opacity-100"}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={f.previewUrl} alt="" draggable={false} className="w-full h-full object-cover pointer-events-none" />
                            <div className="absolute top-0.5 left-0.5 bg-black/60 text-white text-[9px] font-bold px-1 rounded backdrop-blur-sm pointer-events-none">
                              {dotIdx + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Fade indicator to show more scrollable content */}
                      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
                    </div>
                  )}

                  {showCaption && onCaptionChange && (
                    <div className="relative" id={`caption-input-${section.key}-${i}`}>
                      <input
                        autoFocus
                        type="text"
                        placeholder="Add a caption or description for this image..."
                        value={fp.caption ?? ""}
                        onChange={(e) => onCaptionChange(i, e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00EFFE]/40 focus:border-[#00EFFE] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onCaptionChange(i, "");
                          setActiveCaptions(prev => ({ ...prev, [i]: false }));
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Cancel caption"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
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
              <p className="text-xs text-gray-400">Up to {section.maxImages ?? 20} images · JPG, PNG, WebP</p>
            </div>
            <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => onFiles(e.target.files, "image")} />
          </label>
        )}
      </div>
    );
  }

  if (section.inputType === "story_builder") {
    const blocks = data?.storyBlocks ?? [];
    return (
      <div className="space-y-4">
        {blocks.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
            <h3 className="text-lg font-display font-semibold text-gray-700 mb-8">Start building your story:</h3>
            <div className="flex items-center gap-6 sm:gap-10">
              <button type="button" onClick={() => onStoryBlocksChange?.(p => [...p, { id: Date.now().toString(), type: "text" }])}
                className="flex flex-col items-center gap-3 group">
                <div className="w-16 h-16 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center group-hover:border-[#00EFFE] group-hover:text-[#00EFFE] transition-all">
                  <svg className="w-6 h-6 text-gray-400 group-hover:text-[#00EFFE] transition-colors" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>
                </div>
                <span className="text-sm font-medium text-gray-500 group-hover:text-gray-900 transition-colors">Text</span>
              </button>
              
              <label className="flex flex-col items-center gap-3 group cursor-pointer">
                <div className="w-16 h-16 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center group-hover:border-[#00EFFE] group-hover:text-[#00EFFE] transition-all">
                  <svg className="w-6 h-6 text-gray-400 group-hover:text-[#00EFFE] transition-colors" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 18h16.5M12 3v9m0 0l-3-3m3 3l3-3" /></svg>
                </div>
                <span className="text-sm font-medium text-gray-500 group-hover:text-gray-900 transition-colors">Media</span>
                <input type="file" accept="image/*,image/gif,video/mp4,video/webm" className="hidden" onChange={(e) => {
                  if (e.target.files?.[0]) {
                    const f = e.target.files[0];
                    if (f.size > 20 * 1024 * 1024) { alert("File is too large."); return; }
                    const previewUrl = URL.createObjectURL(f);
                    onStoryBlocksChange?.(p => [...p, { id: Date.now().toString(), type: "media", file: { file: f, previewUrl } }]);
                  }
                }} />
              </label>

              <button type="button" onClick={() => onStoryBlocksChange?.(p => [...p, { id: Date.now().toString(), type: "video" }])}
                className="flex flex-col items-center gap-3 group">
                <div className="w-16 h-16 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center group-hover:border-[#00EFFE] group-hover:text-[#00EFFE] transition-all">
                  <svg className="w-6 h-6 text-gray-400 group-hover:text-[#00EFFE] transition-colors" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </div>
                <span className="text-sm font-medium text-gray-500 group-hover:text-gray-900 transition-colors">Embed</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {blocks.map((block, idx) => (
              <div key={block.id} className="relative group/block bg-gray-50 border border-gray-100 rounded-2xl p-4 flex gap-4">
                {/* Controls */}
                <div className="flex flex-col gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity absolute -left-12 top-4">
                  <button type="button" onClick={() => onStoryBlocksChange?.(p => { const b = [...p]; if (idx > 0) { const t = b[idx]; b[idx] = b[idx-1]; b[idx-1] = t; } return b; })} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900 bg-white rounded-full shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                  </button>
                  <button type="button" onClick={() => onStoryBlocksChange?.(p => { const b = [...p]; if (idx < b.length - 1) { const t = b[idx]; b[idx] = b[idx+1]; b[idx+1] = t; } return b; })} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900 bg-white rounded-full shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  </button>
                  <button type="button" onClick={() => onStoryBlocksChange?.(p => p.filter((_, i) => i !== idx))} className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 bg-white rounded-full shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                
                <div className="flex-1 w-full">
                  {block.type === "text" && (
                    <TextBuilderBlock block={block} onChange={(updated) => onStoryBlocksChange?.(p => p.map(b => b.id === block.id ? updated : b))} />
                  )}
                  {block.type === "media" && block.file && (
                    <div className="relative w-full rounded-xl overflow-hidden bg-gray-100">
                      {block.file.file?.type.startsWith("video/") || block.file.previewUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i) ? (
                        <video src={block.file.previewUrl} autoPlay loop muted playsInline className="w-full h-auto" />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={block.file.previewUrl} alt="" className="w-full h-auto" />
                      )}
                    </div>
                  )}
                  {block.type === "video" && (() => {
                    const url = block.videoUrl ?? "";
                    // Parse YouTube / Vimeo URLs into embeddable iframe src
                    let embedSrc = "";
                    if (url) {
                      // YouTube: watch, short, embed
                      const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
                      if (ytMatch) embedSrc = `https://www.youtube.com/embed/${ytMatch[1]}`;
                      // Vimeo
                      const vmMatch = !embedSrc && url.match(/vimeo\.com\/(\d+)/);
                      if (vmMatch) embedSrc = `https://player.vimeo.com/video/${vmMatch[1]}`;
                    }
                    return (
                      <div className="flex flex-col gap-3 w-full">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Paste YouTube or Vimeo URL..."
                            value={url}
                            onChange={(e) => onStoryBlocksChange?.(p => p.map(b => b.id === block.id ? { ...b, videoUrl: e.target.value } : b))}
                            className={baseInput}
                          />
                          {embedSrc && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                          )}
                        </div>
                        {embedSrc && (
                          <div className="w-full aspect-video rounded-xl overflow-hidden bg-black">
                            <iframe
                              src={embedSrc}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title="Video embed preview"
                            />
                          </div>
                        )}
                        {url && !embedSrc && (
                          <p className="text-xs text-amber-600 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" /></svg>
                            Paste a valid YouTube or Vimeo URL to see the preview
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" onClick={() => onStoryBlocksChange?.(p => [...p, { id: Date.now().toString(), type: "text" }])}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>
                Add Text
              </button>
              <label className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 18h16.5M12 3v9m0 0l-3-3m3 3l3-3" /></svg>
                Add Media
                <input type="file" accept="image/*,image/gif,video/mp4,video/webm" className="hidden" onChange={(e) => {
                  if (e.target.files?.[0]) {
                    const f = e.target.files[0];
                    if (f.size > 20 * 1024 * 1024) { alert("File is too large."); return; }
                    const previewUrl = URL.createObjectURL(f);
                    onStoryBlocksChange?.(p => [...p, { id: Date.now().toString(), type: "media", file: { file: f, previewUrl } }]);
                  }
                }} />
              </label>
              <button type="button" onClick={() => onStoryBlocksChange?.(p => [...p, { id: Date.now().toString(), type: "video" }])}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Add Link
              </button>
            </div>
          </>
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
              {videoFile ? (videoFile.file?.name ?? "Uploaded video") : "Upload video file"}
            </p>
            <p className="text-xs text-gray-400">MP4, MOV or WebM · max 20 MB</p>
          </div>
          <input type="file" accept="video/*" className="hidden" onChange={(e) => onFiles(e.target.files, "video")} />
        </label>
      </div>
    );
  }

  return null;
}

// ─── Error message ────────────────────────────────────────────────────────────

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-3 bg-white border border-red-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl p-4">
      <div className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="flex-1 pt-1.5">
        <span className="text-red-600 text-sm font-medium leading-relaxed">{msg}</span>
      </div>
    </div>
  );
}
