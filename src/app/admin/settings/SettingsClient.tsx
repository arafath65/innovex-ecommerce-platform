"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw, Save, Settings2 } from "lucide-react";

export default function SettingsClient() {
  const router = useRouter();
  const [offerPercent, setOfferPercent] = useState("30");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSettings = useCallback(async () => {
  setLoading(true);
  setError("");

  try {
    const response = await fetch("/api/admin/settings", {
      cache: "no-store",
    });

    if (response.status === 401) {
      router.push("/admin/login");
      return;
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to load settings.");
    }

    setOfferPercent(
      String(data.settings?.heroOfferPercent ?? 30),
    );
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to load settings.",
    );
  } finally {
    setLoading(false);
  }
}, [router]);

useEffect(() => {
  const timer = window.setTimeout(() => {
    void loadSettings();
  }, 0);

  return () => window.clearTimeout(timer);
}, [loadSettings]);

  async function saveSettings() {
    const value = Number(offerPercent);

    if (
      !Number.isInteger(value) ||
      value < 0 ||
      value > 100
    ) {
      setError(
        "Enter a whole number between 0 and 100.",
      );
      setSuccess("");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          heroOfferPercent: value,
        }),
      });

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to save settings.",
        );
      }

      setOfferPercent(
        String(data.settings?.heroOfferPercent ?? value),
      );
      setSuccess("Homepage offer updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-page mx-auto max-w-[980px]">
      <section className="relative overflow-hidden rounded-[28px] bg-[#111111] text-white shadow-[0_28px_70px_rgba(0,0,0,0.10)]">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_45%,rgba(215,25,32,0.28),transparent_65%)]" />
        <div className="absolute left-0 top-0 h-[3px] w-full bg-[#d71920]" />

        <div className="relative px-6 py-7 sm:px-8 sm:py-9">
          <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
            <Settings2 size={14} className="text-[#d71920]" />
            Store settings
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Storefront controls
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/45">
            Control the promotional value shown on the homepage hero without editing the storefront code.
          </p>
        </div>
      </section>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] font-medium text-emerald-700">
          <Check size={14} />
          {success}
        </div>
      ) : null}

      <section className="mt-6 rounded-[24px] border border-black/7 bg-white p-5 shadow-[0_12px_35px_rgba(17,17,17,0.05)] sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#d71920]">
              Homepage hero
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-black">
              Promotional offer
            </h2>
            <p className="mt-2 max-w-xl text-xs leading-5 text-black/42">
              This value appears in the circular “Up to …% Off” badge on the homepage hero carousel.
            </p>
          </div>

          <div className="rounded-2xl bg-[#f7f6f3] px-4 py-3 text-right">
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-black/30">
              Preview
            </p>
            <p className="mt-1 text-2xl font-black text-[#d71920]">
              Up to {offerPercent || 0}% Off
            </p>
          </div>
        </div>

        <div className="mt-7 max-w-[360px]">
          <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-black/55">
            Offer percentage
          </label>

          <div className="mt-2 flex overflow-hidden rounded-2xl border border-black/10 bg-white focus-within:border-[#d71920]/40">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={offerPercent}
              disabled={loading || saving}
              onChange={(event) => setOfferPercent(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-xl font-black outline-none"
            />
            <div className="grid w-14 place-items-center bg-[#111111] text-xl font-black text-white">
              %
            </div>
          </div>

          <p className="mt-2 text-[9px] text-black/35">
            Use a whole number from 0 to 100.
          </p>
        </div>

        <div className="mt-7 flex flex-wrap gap-3 border-t border-black/7 pt-5">
          <button
            type="button"
            onClick={() => void saveSettings()}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#d71920] px-5 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Save size={13} />
            )}
            {saving ? "Saving..." : "Save setting"}
          </button>

          <button
            type="button"
            onClick={() => void loadSettings()}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-5 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-black/60 transition hover:border-black/20 hover:text-black disabled:opacity-50"
          >
            <RefreshCw size={13} />
            Reload
          </button>
        </div>
      </section>
    </div>
  );
}
