"use server";

import { adminDb, ADMIN_DEV_MODE } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import type { QualityTier, SubmissionStatus } from "@/lib/types";

export async function reviewSubmission(
  id: string,
  status: SubmissionStatus,
  category: string,
  qualityTier: QualityTier,
  tags: string[],
  adminNotes: string,
): Promise<{ ok: boolean; error?: string }> {
  if (ADMIN_DEV_MODE) {
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true };
  }

  try {
    await adminDb.collection("portfolio_items").doc(id).update({
      status,
      category,
      quality_tier:  qualityTier,
      tags,
      admin_notes:   adminNotes.trim() || null,
      updated_at:    new Date().toISOString(),
    });
    revalidatePath("/admin/submissions");
    revalidatePath(`/admin/submissions/${id}`);
    return { ok: true };
  } catch (err) {
    console.error("[reviewSubmission]", err);
    return { ok: false, error: "Failed to update submission." };
  }
}
