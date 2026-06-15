import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAuth } from "firebase-admin/auth";

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

function initAdmin(): App {
  if (getApps().length > 0) return getApps()[0];

  // In dev mode use a minimal placeholder app — no real Firebase calls will be made
  if (DEV_MODE) {
    return initializeApp({ projectId: "dev-placeholder" });
  }

  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const adminApp = initAdmin();

export const adminDb      = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
export const adminAuth    = getAuth(adminApp);
export { DEV_MODE as ADMIN_DEV_MODE };
