"use server";

import { adminDb, ADMIN_DEV_MODE } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import type { QualityTier, Provider } from "@/lib/types";

export async function updateProvider(
  id: string,
  data: {
    name: string;
    first_name: string;
    last_name: string;
    phone: string;
    category: string;
    skills: string[];
    quality_tier: QualityTier;
    availability: "available" | "busy" | "unavailable";
    bio: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  if (ADMIN_DEV_MODE) {
    await new Promise((r) => setTimeout(r, 500));
    return { ok: true };
  }
  try {
    await adminDb.collection("providers").doc(id).update({
      ...data,
      updated_at: new Date().toISOString(),
    });
    revalidatePath("/admin/providers");
    revalidatePath(`/admin/providers/${id}/edit`);
    return { ok: true };
  } catch (err) {
    console.error("[updateProvider]", err);
    return { ok: false, error: "Failed to update provider." };
  }
}

export async function getProviderById(id: string): Promise<Provider | null> {
  if (ADMIN_DEV_MODE) {
    const DEV: Provider = {
      id, uid: id,
      first_name: "Dara", last_name: "Okunade", name: "Dara Okunade",
      phone: "+2348012345678", category: "Branding, Design & Identity",
      subcategories: ["Logo Design", "Brand Identity Systems"],
      bio: "5 years building brands for Nigerian startups.",
      skills: ["Logo Design", "Brand Identity Systems", "Typography"],
      quality_tier: "Gold", availability: "available",
      onboarding_complete: true, created_at: "", updated_at: "",
    };
    return DEV;
  }
  try {
    const doc = await adminDb.collection("providers").doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Provider;
  } catch {
    return null;
  }
}
