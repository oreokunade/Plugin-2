# Plugin PIL — Backlog

## OCR Image Scanning

**Goal:** Automatically detect visible contact information (phone numbers, @handles, emails, watermarks) embedded in uploaded portfolio images before they reach clients.

### What's already done
- EXIF metadata stripping via Sharp on every upload ✅
- Filename-based contact pattern scan ✅
- `ocr_flagged` field stored in Firestore + surfaced in admin review queue ✅
- Client-side aspect-ratio heuristic (flags tall/narrow screenshots) ✅

### What's needed
- **Real text-in-image OCR** on the server after upload

### Recommended approach: Tesseract.js (no API key)
```bash
npm install tesseract.js
```

In `/api/upload/route.ts`, after Sharp processing:
```ts
import Tesseract from "tesseract.js";

const { data } = await Tesseract.recognize(processedBuffer, "eng");
const detectedText = data.text;
const ocr_flagged = CONTACT_PATTERNS.some((p) => p.test(detectedText));
```

Tesseract runs WASM in Node — no external API needed, ~2–5s per image.
For production at scale, swap to **Google Cloud Vision API** (faster, more accurate).

### Alternative: Google Cloud Vision
```ts
const vision = new ImageAnnotatorClient();
const [result] = await vision.textDetection({ image: { content: buffer } });
const text = result.fullTextAnnotation?.text ?? "";
```
Requires `GOOGLE_APPLICATION_CREDENTIALS` env var.

### Admin flow on OCR flag
- Admin sees ⚠️ banner on submission card in `/admin/submissions`
- Admin sees extracted text excerpt in `/admin/submissions/[id]` review page
- Admin can override flag (false positive) and approve anyway

### Priority: Medium
Not blocking any current flow. Providers are warned at upload time. Admin reviews all work before it goes live.
