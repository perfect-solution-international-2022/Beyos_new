"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Consent = "accepted" | "rejected";
const COOKIE_NAME = "beyos_cookie_consent";

function readConsent(): Consent | null {
  const value = document.cookie.split("; ").find((item) => item.startsWith(`${COOKIE_NAME}=`))?.split("=")[1];
  return value === "accepted" || value === "rejected" ? value : null;
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => setVisible(!readConsent()), []);

  const choose = (consent: Consent) => {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_NAME}=${consent}; Path=/; Max-Age=15552000; SameSite=Lax${secure}`;
    window.dispatchEvent(new CustomEvent("beyos:cookie-consent", { detail: consent }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-navy-900/20 p-3 backdrop-blur-[2px] sm:p-6">
      <aside aria-label="Cookie consent" className="w-full max-w-2xl overflow-hidden rounded-[24px] border border-white/60 bg-white shadow-[0_24px_80px_rgba(15,37,64,0.28)]">
        <div className="h-1.5 bg-gradient-to-r from-[#a94700] via-brand to-amber-300" />
        <div className="p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-[#a94700] ring-1 ring-brand/15"><CookieIcon /></div>
            <div>
              <p className="font-display text-xl font-bold text-navy-800 sm:text-2xl">Your privacy, your choice</p>
              <p className="mt-1.5 text-sm leading-6 text-navy-800/65">Cookies keep your cart and sign-in secure. Optional cookies help us understand useful pages and improve your shopping experience.</p>
            </div>
          </div>

          {customizing ? (
            <div className="mt-5 space-y-3" id="cookie-preferences">
              <CookieChoice icon="lock" title="Essential cookies" description="Required for secure login, your cart, checkout and remembering this choice. These cannot be switched off." enabled locked />
              <CookieChoice icon="chart" title="Analytics cookies" description="Help us understand visits and page performance so we can make the website faster and easier to use." enabled={analytics} onChange={setAnalytics} />
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-navy-800/65 sm:text-xs">
              <div className="rounded-xl bg-navy-50 px-2 py-3"><span className="block text-base">🛒</span>Remember cart</div>
              <div className="rounded-xl bg-navy-50 px-2 py-3"><span className="block text-base">🔐</span>Secure sign-in</div>
              <div className="rounded-xl bg-navy-50 px-2 py-3"><span className="block text-base">✨</span>Improve experience</div>
            </div>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-navy-800/10 pt-5 sm:flex-row sm:items-center">
            <Link href="/privacy#cookies" className="px-2 py-2 text-center text-xs font-semibold text-navy-800/55 underline-offset-4 hover:text-[#a94700] hover:underline">Privacy & Cookie Policy</Link>
            <div className="flex flex-1 flex-wrap justify-end gap-2">
              {customizing ? (
                <>
                  <button type="button" onClick={() => setCustomizing(false)} className="rounded-full px-4 py-2.5 text-sm font-semibold text-navy-800/60 hover:bg-navy-50">Back</button>
                  <button type="button" onClick={() => choose(analytics ? "accepted" : "rejected")} className="btn-primary px-5 py-2.5">Save choices</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setCustomizing(true)} className="rounded-full border border-navy-800/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:bg-navy-50">Customize</button>
                  <button type="button" onClick={() => choose("rejected")} className="rounded-full px-4 py-2.5 text-sm font-semibold text-navy-800/65 hover:bg-navy-50">Essential only</button>
                  <button type="button" onClick={() => choose("accepted")} className="btn-primary px-5 py-2.5">Accept all</button>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function CookieChoice({ icon, title, description, enabled, locked = false, onChange }: {
  icon: "lock" | "chart"; title: string; description: string; enabled: boolean; locked?: boolean; onChange?: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-navy-800/10 bg-navy-50/50 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-base shadow-sm" aria-hidden="true">{icon === "lock" ? "🔒" : "📊"}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-navy-800">{title}</p>{locked && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Always on</span>}</div>
        <p className="mt-0.5 text-xs leading-5 text-navy-800/55">{description}</p>
      </div>
      {!locked && <button type="button" role="switch" aria-checked={enabled} aria-label={`Enable ${title}`} onClick={() => onChange?.(!enabled)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${enabled ? "bg-[#a94700]" : "bg-navy-800/20"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? "left-6" : "left-1"}`} /></button>}
    </div>
  );
}

function CookieIcon() {
  return <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 13.1A9 9 0 1 1 10.9 3.2 4.5 4.5 0 0 0 20.8 13.1Z" /><circle cx="8.3" cy="10.2" r=".8" fill="currentColor" stroke="none" /><circle cx="11.5" cy="15.3" r=".8" fill="currentColor" stroke="none" /><circle cx="6.8" cy="15.5" r=".8" fill="currentColor" stroke="none" /></svg>;
}
