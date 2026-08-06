"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db, DEV_MODE } from "@/lib/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { CATEGORY_MAP, getSubcategoriesForCategory } from "@/lib/templates";
import { Logo } from "@/components/ui/Logo";

const MAX_SUBS = 5;

type Step = "profile" | "ready";

interface ProfileDraft {
  firstName:     string;
  lastName:      string;
  category:      string;
  subcategories: string[];
  bio:           string;
}

declare global {
  interface Window { recaptchaVerifier: RecaptchaVerifier; }
}

// ─── Category icons (brand teal strokes) ─────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Website, App & Software Development": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8l3 3-3 3"/>
      <path d="M13 14h3"/>
    </svg>
  ),
  "Digital Marketing & E-Commerce": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  "Digital & Creative Economy": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
    </svg>
  ),
  "Branding, Design & Identity": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  "Writing, Editing & Publishing": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  "Video, Film & Entertainment": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14"/>
      <rect x="2" y="6" width="13" height="12" rx="2"/>
    </svg>
  ),
  "Music & Audio Production": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  ),
  "Media, Talent & Influencer Services": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  ),
  "Education, Coaching & Personal Development": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  "Business, Corporate & Financial Services": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
  ),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

function OnboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneFromUrl = searchParams.get("phone") || "";
  const [step, setStep]                 = useState<Step>("profile");
  const [profile, setProfile]           = useState<ProfileDraft>({
    firstName: "", lastName: "", category: "", subcategories: [], bio: "",
  });
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");

  useEffect(() => {
    if (DEV_MODE) return;
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      const snap = await getDoc(doc(db, "providers", user.uid));
      if (snap.exists() && snap.data().onboarding_complete) router.replace("/dashboard");
    });
    return () => unsub();
  }, [router]);



  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      setError("First name and last name are required."); return;
    }
    if (!profile.category) { setError("Please select your primary service."); return; }
    if (profile.subcategories.length === 0) {
      setError("Please select at least one specialisation."); return;
    }
    setError("");
    if (DEV_MODE) { 
      try {
        localStorage.setItem("dev_profile_draft", JSON.stringify({
          firstName: profile.firstName.trim(),
          lastName: profile.lastName.trim(),
          category: profile.category,
          bio: profile.bio.trim()
        }));
      } catch (e) {}
      setStep("ready"); 
      return; 
    }
    setLoading(true);
    try {
      const user     = auth.currentUser;
      const uid      = user?.uid ?? `wa-${phoneFromUrl.replace(/\D/g, "")}`;
      const fullName = `${profile.firstName.trim()} ${profile.lastName.trim()}`;
      await setDoc(doc(db, "providers", uid), {
        uid, phone: phoneFromUrl || user?.phoneNumber || "",
        first_name: profile.firstName.trim(), last_name: profile.lastName.trim(), name: fullName,
        category: profile.category, subcategories: profile.subcategories,
        bio: profile.bio.trim(), skills: profile.subcategories,
        quality_tier: "Bronze", availability: "available",
        onboarding_complete: true, bot_onboarded: false,
        created_at: serverTimestamp(), updated_at: serverTimestamp(),
      });
      setStep("ready");
    } catch (err) { setError("Failed to save. Please try again."); console.error(err); }
    finally { setLoading(false); }
  }

  function pickCategory(cat: string) {
    setProfile((p) => ({ ...p, category: cat, subcategories: [] }));
  }

  function clearCategory() {
    setProfile((p) => ({ ...p, category: "", subcategories: [] }));
  }

  function toggleSub(sub: string) {
    setProfile((p) => {
      const has = p.subcategories.includes(sub);
      if (has) return { ...p, subcategories: p.subcategories.filter((s) => s !== sub) };
      if (p.subcategories.length >= MAX_SUBS) return p;
      return { ...p, subcategories: [...p.subcategories, sub] };
    });
  }

  const availableSubs = profile.category ? getSubcategoriesForCategory(profile.category) : [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 h-14 flex items-center">
        <Logo variant="full" height={22} />
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-10 lg:py-14">
        <div className="w-full max-w-lg">



          {/* ── Profile ── */}
          {step === "profile" && (
            <div>
              <StepBar current={1} total={2} />
              <h1 className="font-display font-bold text-gray-900 text-3xl tracking-tight mb-2">Set up your profile</h1>
              <p className="text-gray-500 text-[15px] mb-10 leading-relaxed max-w-sm">Clients see this next to your work. Your name, category, and what you specialise in.</p>

              <form onSubmit={handleProfileSubmit} className="space-y-6">

                {/* ── Name ── */}
                <div className="bg-white border border-gray-200/60 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your name</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label required>First name</Label>
                      <Input required autoFocus placeholder="Amara" className="mt-2"
                        value={profile.firstName}
                        onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} />
                    </div>
                    <div>
                      <Label required>Last name</Label>
                      <Input required placeholder="Nwosu" className="mt-2"
                        value={profile.lastName}
                        onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">Only your first name is visible to clients.</p>
                </div>

                {/* ── Primary service ── */}
                <div className="bg-white border border-gray-200/60 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Primary service <span className="text-[#00EFFE]">*</span></p>
                    {profile.category && (
                      <button type="button" onClick={clearCategory}
                        className="text-xs text-[#0C5BEE] hover:text-[#0841B5] font-medium transition-colors">
                        Change
                      </button>
                    )}
                  </div>

                  {/* Before selection: full list */}
                  {!profile.category && (
                    <div className="space-y-2">
                      {CATEGORY_MAP.map((cat) => (
                        <button key={cat.label} type="button" onClick={() => pickCategory(cat.label)}
                          className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-[#00EFFE]/5 hover:border-[#00EFFE]/30 text-left transition-all group">
                          <span className="w-5 h-5 flex-shrink-0 text-[#0D5C6F] group-hover:text-[#00EFFE] transition-colors">
                            {CATEGORY_ICONS[cat.label]}
                          </span>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex-1">{cat.label}</span>
                          <svg className="w-4 h-4 text-gray-300 group-hover:text-[#00EFFE] transition-colors flex-shrink-0"
                            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* After selection: just the selected category */}
                  {profile.category && (
                    <div className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-[#00EFFE]/8 border border-[#00EFFE]/30">
                      <span className="w-5 h-5 flex-shrink-0 text-[#00EFFE]">
                        {CATEGORY_ICONS[profile.category]}
                      </span>
                      <span className="text-sm font-semibold text-[#0C5BEE] flex-1">{profile.category}</span>
                      <svg className="w-4 h-4 text-[#00EFFE] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* ── Specialisations (shown after category pick) ── */}
                {profile.category && (
                  <div className="bg-white border border-gray-200/60 rounded-3xl p-6 sm:p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Specialisations <span className="text-[#00EFFE]">*</span>
                      </p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full transition-colors ${
                        profile.subcategories.length === MAX_SUBS
                          ? "bg-[#00EFFE] text-[#0A0A0A]"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {profile.subcategories.length}/{MAX_SUBS}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-4">Pick up to {MAX_SUBS} that best describe your work.</p>
                    <div className="flex flex-wrap gap-2">
                      {availableSubs.map((sub) => {
                        const selected = profile.subcategories.includes(sub);
                        const maxed    = !selected && profile.subcategories.length >= MAX_SUBS;
                        return (
                          <button key={sub} type="button"
                            onClick={() => toggleSub(sub)} disabled={maxed}
                            className={`text-sm px-3.5 py-2 rounded-xl border font-medium transition-all ${
                              selected
                                ? "bg-[#0D5C6F] border-[#0D5C6F] text-white"
                                : maxed
                                  ? "bg-white border-gray-100 text-gray-300 cursor-not-allowed"
                                  : "bg-white border-gray-200 text-gray-600 hover:border-[#0D5C6F]/40 hover:text-[#0D5C6F]"
                            }`}>
                            {selected && (
                              <svg className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {sub}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Bio ── */}
                {profile.category && (
                  <div className="bg-white border border-gray-200/60 rounded-3xl p-6 sm:p-8 shadow-sm">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                      Short bio <span className="normal-case font-normal text-gray-400">(optional)</span>
                    </p>
                    <textarea rows={3}
                      placeholder="e.g. 5 years building brands for Nigerian startups. I specialise in logo design and visual identity systems."
                      value={profile.bio}
                      onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all resize-none" />
                  </div>
                )}

                {error && <ErrorMsg msg={error} />}
                <PrimaryBtn loading={loading} label="Save & continue →" />
              </form>
            </div>
          )}

          {/* ── Ready ── */}
          {step === "ready" && (
            <div className="text-center">
              <div className="w-16 h-16 bg-[#00EFFE]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-[#0D5C6F]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-display font-bold text-gray-900 text-2xl mb-2">
                You&apos;re all set{profile.firstName ? `, ${profile.firstName}` : ""}!
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
                Your profile is live. Now add some work — that&apos;s what gets clients excited.
              </p>
              <button onClick={() => router.push("/dashboard/upload")}
                className="w-full py-3.5 bg-[#00EFFE] hover:bg-[#00D4E0] text-[#0A0A0A] text-sm font-semibold rounded-xl transition-colors">
                Upload my first project →
              </button>
              <button onClick={() => router.push("/dashboard")}
                className="mt-3 w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                I&apos;ll do it later
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const STEP_META = [
  {
    label: "Enter your number",
  },
  {
    label: "Verify with code",
  },
  {
    label: "Build your profile",
  },
];

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-between w-full mb-16 relative">
      {STEP_META.slice(0, total).map((s, i) => {
        const num    = i + 1;
        const done   = num < current;
        const active = num === current;
        return (
          <div key={num} className="relative flex flex-col items-center flex-1">
            {/* Connecting Line (background) */}
            {i < total - 1 && (
              <div className="absolute top-[18px] left-[50%] w-full h-[2px] bg-gray-200 -z-10" />
            )}
            {/* Connecting Line (active/done) */}
            {i < total - 1 && done && (
              <div className="absolute top-[18px] left-[50%] w-full h-[2px] bg-[#00EFFE] -z-10 transition-all duration-500" />
            )}

            {/* Circle */}
            <div
              className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 text-sm font-semibold ${
                done    ? "bg-[#00EFFE] text-[#0D5C6F] shadow-sm"
                : active ? "bg-gray-900 text-white shadow-md ring-4 ring-gray-900/10"
                : "bg-white text-gray-400 ring-1 ring-gray-200"
              }`}
            >
              {done ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M5 13l4 4L19 7"/>
                </svg>
              ) : (
                num
              )}
            </div>

            {/* Label */}
            <div className="absolute top-12 w-28 text-center flex justify-center">
              <span className={`text-xs font-medium leading-tight transition-colors ${
                active ? "text-gray-900" : done ? "text-gray-600" : "text-gray-400"
              }`}>
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepCard({ step, total, title, subtitle, children }: {
  step: number; total: number; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div>
      <StepBar current={step} total={total} />
      <h1 className="font-display font-bold text-gray-900 text-3xl tracking-tight mb-2">{title}</h1>
      <p className="text-gray-500 text-[15px] mb-8 leading-relaxed max-w-sm">{subtitle}</p>
      {children}
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
      {children}{required && <span className="text-[#00EFFE] ml-0.5">*</span>}
    </label>
  );
}

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      className={`w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all ${className}`} />
  );
}

function PrimaryBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 active:scale-[0.99] disabled:opacity-50 text-white text-[15px] font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2">
      {loading
        ? <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /><span>Please wait…</span></>
        : label}
    </button>
  );
}

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

export default function OnboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500 font-medium">Loading...</div>}>
      <OnboardContent />
    </Suspense>
  );
}
