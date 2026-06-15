import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { adminStorage } from "@/lib/firebase-admin";

// ─── Contact pattern detection ────────────────────────────────────────────────

const CONTACT_PATTERNS = [
  /\+?[0-9]{10,14}/,
  /@[a-zA-Z0-9_.]{2,}/,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  /wa\.me\//i,
  /whatsapp/i,
];

function hasContactInText(text: string): boolean {
  return CONTACT_PATTERNS.some((p) => p.test(text));
}

// ─── Plugin watermark SVG ─────────────────────────────────────────────────────

function buildWatermarkSvg(width: number, height: number): Buffer {
  const fontSize  = Math.max(10, Math.round(width * 0.022));
  const padding   = Math.round(width * 0.015);
  const textWidth = fontSize * 4.5;
  const boxH      = fontSize + padding * 2;
  const boxW      = textWidth + padding * 2;
  const x         = width  - boxW - padding;
  const y         = height - boxH - padding;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${x}" y="${y}" width="${boxW}" height="${boxH}"
        rx="4" ry="4" fill="rgba(0,0,0,0.45)" />
      <text
        x="${x + padding}" y="${y + padding + fontSize * 0.82}"
        font-family="system-ui, sans-serif"
        font-size="${fontSize}" font-weight="600"
        fill="rgba(255,255,255,0.75)" letter-spacing="0.5"
      >plugin</text>
    </svg>`;

  return Buffer.from(svg);
}

// ─── Image processing pipeline ────────────────────────────────────────────────

async function processImage(
  input: Buffer,
  applyWatermark = true
): Promise<{ output: Buffer }> {
  const meta = await sharp(input).metadata();
  const w    = meta.width  ?? 1920;
  const h    = meta.height ?? 1080;

  let pipeline = sharp(input)
    .rotate()
    .resize(2048, 2048, { fit: "inside", withoutEnlargement: true });

  if (applyWatermark) {
    const watermark = buildWatermarkSvg(Math.min(w, 2048), Math.min(h, 2048));
    pipeline = pipeline.composite([{ input: watermark, gravity: "southeast" }]);
  }

  const output = await pipeline
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  return { output };
}

// ─── POST /api/upload ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Dev mode: return mock URLs immediately — no Firebase call
  if (process.env.NEXT_PUBLIC_DEV_MODE === "true") {
    const form  = await req.formData();
    const files = form.getAll("files") as File[];
    const urls  = files.map((_, i) => `/api/placeholder?n=${i + 1}`);
    return NextResponse.json({ urls, ocr_flagged: false });
  }

  try {
    const form           = await req.formData();
    const files          = form.getAll("files") as File[];
    const uid            = form.get("uid") as string;
    const applyWatermark = form.get("watermark") !== "false";

    if (!uid || files.length === 0) {
      return NextResponse.json({ error: "Missing uid or files" }, { status: 400 });
    }

    const bucket = adminStorage.bucket();
    const urls: string[] = [];
    let ocr_flagged      = false;

    for (const file of files) {
      if (hasContactInText(file.name)) ocr_flagged = true;

      const arrayBuffer = await file.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuffer);

      let uploadBuffer: Buffer;
      let contentType: string;

      if (file.type.startsWith("image/")) {
        const { output } = await processImage(inputBuffer, applyWatermark);
        uploadBuffer = output;
        contentType  = "image/jpeg";
      } else {
        uploadBuffer = inputBuffer;
        contentType  = file.type;
      }

      const ext         = file.type.startsWith("image/") ? "jpg" : (file.name.split(".").pop() ?? "mp4");
      const storagePath = `portfolio/${uid}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const fileRef     = bucket.file(storagePath);

      await fileRef.save(uploadBuffer, { metadata: { contentType } });

      const [signedUrl] = await fileRef.getSignedUrl({
        action:  "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      urls.push(signedUrl);
    }

    return NextResponse.json({ urls, ocr_flagged });

  } catch (err) {
    console.error("[/api/upload] Error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
