"use server";

import { adminDb, ADMIN_DEV_MODE } from "@/lib/firebase-admin";

export async function setAvailability(
  uid: string,
  availability: "available" | "busy" | "unavailable",
): Promise<{ ok: boolean; error?: string }> {
  if (ADMIN_DEV_MODE) {
    await new Promise((r) => setTimeout(r, 300));
    return { ok: true };
  }
  try {
    await adminDb.collection("providers").doc(uid).update({
      availability,
      updated_at: new Date().toISOString(),
    });
    return { ok: true };
  } catch (err) {
    console.error("[setAvailability]", err);
    return { ok: false, error: "Failed to update." };
  }
}
