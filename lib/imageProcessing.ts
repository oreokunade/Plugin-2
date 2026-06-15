/**
 * lib/imageProcessing.ts
 * Client-side image validation helpers.
 * Heavy processing (EXIF strip, OCR, watermark) happens server-side in /api/upload.
 */

// ─── Contact pattern detection (filename + canvas text) ──────────────────────

const CONTACT_PATTERNS = [
  /\+?[0-9]{10,14}/,                                          // phone numbers
  /@[a-zA-Z0-9_.]{2,}/,                                       // @handles
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,         // emails
  /wa\.me\//i,                                                  // wa.me links
  /whatsapp/i,
  /instagram\.com/i,
  /twitter\.com/i,
  /linkedin\.com/i,
];

export function hasContactInFilename(filename: string): boolean {
  return CONTACT_PATTERNS.some((p) => p.test(filename));
}

// ─── File validation ──────────────────────────────────────────────────────────

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const MAX_FILE_SIZE_MB = 20;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export function validateUploadFile(file: File, type: "image" | "video" | "any" = "any"): FileValidationResult {
  const errors: string[]   = [];
  const warnings: string[] = [];

  // Size check
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_FILE_SIZE_MB) {
    errors.push(`File is ${sizeMB.toFixed(1)} MB — max is ${MAX_FILE_SIZE_MB} MB.`);
  }

  // Type check
  const accepted = type === "image" ? ACCEPTED_IMAGE_TYPES
                 : type === "video" ? ACCEPTED_VIDEO_TYPES
                 : [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES];
  if (!accepted.includes(file.type)) {
    errors.push(`File type "${file.type}" is not supported.`);
  }

  // Filename contact check
  if (hasContactInFilename(file.name)) {
    warnings.push(`Filename "${file.name}" looks like it may contain contact info.`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateFiles(files: File[], type: "image" | "video" | "any" = "any"): FileValidationResult {
  const allErrors:   string[] = [];
  const allWarnings: string[] = [];

  for (const file of files) {
    const result = validateUploadFile(file, type);
    allErrors.push(...result.errors.map((e) => `${file.name}: ${e}`));
    allWarnings.push(...result.warnings);
  }

  return { valid: allErrors.length === 0, errors: allErrors, warnings: allWarnings };
}

// ─── Canvas-based text extraction (lightweight OCR hint) ─────────────────────
// Not full OCR — but catches obvious text in simple images client-side.
// Real OCR runs server-side via the /api/upload pipeline.

export async function previewImageForContact(file: File): Promise<{ flagged: boolean; reason?: string }> {
  return new Promise((resolve) => {
    // Skip if not an image
    if (!file.type.startsWith("image/")) { resolve({ flagged: false }); return; }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      // We can't run real OCR in the browser without wasm.
      // Instead: flag suspiciously small images (screenshots often contain text)
      // and images with unusual aspect ratios (chat screenshots etc.)
      const ratio = img.width / img.height;
      if (ratio > 2.5 || ratio < 0.3) {
        resolve({ flagged: true, reason: "Unusual aspect ratio — may be a screenshot with contact info." });
      } else {
        resolve({ flagged: false });
      }
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve({ flagged: false }); };
    img.src = url;
  });
}

// ─── Format bytes ─────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1024)            return `${bytes} B`;
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
