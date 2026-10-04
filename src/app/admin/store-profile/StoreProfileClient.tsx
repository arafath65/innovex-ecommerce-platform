"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Check, ImagePlus, Loader2, RefreshCw, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type HeroSlide = {
  id: number;
  imageUrl: string;
  eyebrow: string | null;
  title: string | null;
  accentText: string | null;
  description: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

type Profile = {
  displayName: string;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  supportEmail: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  aboutText: string | null;
  shippingPolicy: string | null;
  returnsPolicy: string | null;
  refundPolicy: string | null;
  privacyPolicy: string | null;
  termsText: string | null;
  faqText: string | null;
};

type Settings = {
  heroOfferPercent: number;
  freeDeliveryThreshold: string;
  deliveryCharge: string;
  minimumOrder: string;
  allowPickup: boolean;
  cashOnDelivery: boolean;
  bankTransfer: boolean;
  cardPayment: boolean;
  onlinePayment: boolean;
  islandwideDelivery: boolean;
};

type Theme = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  headerStyle: string;
  buttonStyle: string;
};

const emptyProfile: Profile = {
  displayName: "",
  tagline: "",
  description: "",
  logoUrl: null,
  phone: "",
  whatsapp: "",
  email: "",
  supportEmail: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  district: "",
  province: "",
  postalCode: "",
  country: "Sri Lanka",
  facebookUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
  aboutText: "",
  shippingPolicy: "",
  returnsPolicy: "",
  refundPolicy: "",
  privacyPolicy: "",
  termsText: "",
  faqText: "",
};

const defaultSettings: Settings = {
  heroOfferPercent: 30,
  freeDeliveryThreshold: "5000",
  deliveryCharge: "0",
  minimumOrder: "0",
  allowPickup: false,
  cashOnDelivery: true,
  bankTransfer: true,
  cardPayment: false,
  onlinePayment: false,
  islandwideDelivery: true,
};

const defaultTheme: Theme = {
  primaryColor: "#d71920",
  secondaryColor: "#111111",
  accentColor: "#f59e0b",
  backgroundColor: "#ffffff",
  surfaceColor: "#f6f5f2",
  textColor: "#111111",
  mutedColor: "#6b7280",
  headerStyle: "CLASSIC",
  buttonStyle: "ROUNDED",
};

function toNullableString(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function numberAsString(value: unknown) {
  return Number(value ?? 0).toString();
}

export default function StoreProfileClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [template, setTemplate] = useState("MODERN");
  const [storeName, setStoreName] = useState("");
  const [currency, setCurrency] = useState("LKR");
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [heroBusy, setHeroBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/store-profile", { cache: "no-store" });
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to load store profile.");

      const nextProfile = data.profile ?? {};
      const nextSettings = data.settings ?? {};
      const nextTheme = data.theme ?? {};

      setStoreName(String(data.store?.name ?? ""));
      setCurrency(String(data.store?.currency ?? "LKR"));
      setTemplate(String(data.template ?? "MODERN"));
      setProfile({
        ...emptyProfile,
        ...nextProfile,
        ...Object.fromEntries(Object.keys(emptyProfile).map((key) => [key, toNullableString(nextProfile[key])])),
        logoUrl: nextProfile.logoUrl ?? null,
      } as Profile);
      setSettings({
        ...defaultSettings,
        ...nextSettings,
        heroOfferPercent: Number(nextSettings.heroOfferPercent ?? 30),
        freeDeliveryThreshold: numberAsString(nextSettings.freeDeliveryThreshold),
        deliveryCharge: numberAsString(nextSettings.deliveryCharge),
        minimumOrder: numberAsString(nextSettings.minimumOrder),
      });
      setTheme({ ...defaultTheme, ...nextTheme });
      setHeroSlides(Array.isArray(data.heroSlides) ? data.heroSlides : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load store profile.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save() {
    if (saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/store-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency,
          template,
          profile: {
            ...profile,
            businessName: storeName,
          },
          settings,
          theme,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to save store profile.");

      setSuccess("Store profile and storefront settings saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save store profile.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setUploadingLogo(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/store-profile/logo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to upload logo.");

      setProfile((current) => ({ ...current, logoUrl: data.logoUrl }));
      setSuccess("Store logo updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function addHeroSlide(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    if (heroSlides.length >= 3) {
      setError("Each store can have a maximum of 3 hero slides.");
      return;
    }

    setHeroBusy(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("eyebrow", "NEW SEASON");
      formData.append("title", "Upgrade Your");
      formData.append("accentText", "Storefront");
      formData.append("description", "Tell customers what makes your collection special.");
      formData.append("buttonText", "Shop now");
      formData.append("buttonUrl", "/shop");

      const response = await fetch("/api/admin/hero-slides", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to upload hero slide.");

      setHeroSlides((current) => [...current, data.heroSlide]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload hero slide.");
    } finally {
      setHeroBusy(false);
    }
  }

  async function updateHeroSlide(slide: HeroSlide) {
    setHeroBusy(true);
    setError("");

    try {
      const response = await fetch("/api/admin/hero-slides", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slide),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to update hero slide.");

      setHeroSlides((current) => current.map((item) => item.id === slide.id ? data.heroSlide : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update hero slide.");
    } finally {
      setHeroBusy(false);
    }
  }

  async function removeHeroSlide(id: number) {
    if (!window.confirm("Remove this homepage hero slide?")) return;

    setHeroBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/hero-slides?id=${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to remove hero slide.");

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove hero slide.");
    } finally {
      setHeroBusy(false);
    }
  }

  const logoPreview = profile.logoUrl || "";
  const heroCountLabel = useMemo(() => `${heroSlides.length}/3`, [heroSlides.length]);

  if (loading) {
    return <div className="admin-page grid min-h-[420px] place-items-center"><Loader2 className="animate-spin text-[#d71920]" /></div>;
  }

  return (
    <div className="admin-page mx-auto max-w-[1200px]">
      <section className="relative overflow-hidden rounded-[28px] bg-[#111111] text-white shadow-[0_28px_70px_rgba(0,0,0,0.10)]">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_75%_40%,rgba(215,25,32,.3),transparent_65%)]" />
        <div className="relative px-6 py-8 sm:px-8 lg:px-10">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#d71920]">Store Profile</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Your storefront identity.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">Everything your customers see should come from this store configuration. No store-specific values belong in the storefront code.</p>
        </div>
      </section>

      {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-700">{error}</div> : null}
      {success ? <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] font-medium text-emerald-700"><Check size={14} />{success}</div> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-[24px] border border-black/7 bg-white p-5 shadow-[0_12px_35px_rgba(17,17,17,.05)] sm:p-7">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#d71920]">Business identity</p>
          <h2 className="mt-2 text-xl font-black">How customers know your store</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Business name" value={storeName} onChange={setStoreName} />
            <Field label="Display name" value={profile.displayName} onChange={(value) => setProfile((p) => ({ ...p, displayName: value }))} />
            <Field label="Tagline" value={profile.tagline ?? ""} onChange={(value) => setProfile((p) => ({ ...p, tagline: value }))} />
            <Field label="Currency" value={currency} onChange={(value) => setCurrency(value.toUpperCase().slice(0, 3))} />
          </div>

          <TextArea label="Store description" value={profile.description ?? ""} onChange={(value) => setProfile((p) => ({ ...p, description: value }))} />

          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-black/7 bg-[#faf9f6] p-4 sm:flex-row sm:items-center">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-black/8 bg-white">
              {logoPreview ? <img src={logoPreview} alt="Store logo" className="h-full w-full object-contain p-2" /> : <span className="text-[9px] font-black uppercase text-black/20">No logo</span>}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[.12em]">Store logo</p>
              <p className="mt-1 text-[10px] text-black/40">JPG, PNG or WebP. Maximum 2 MB.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#111111] px-4 py-3 text-[10px] font-black uppercase tracking-[.1em] text-white hover:bg-[#d71920]">
              {uploadingLogo ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
              {uploadingLogo ? "Uploading" : "Upload logo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadLogo} disabled={uploadingLogo} />
            </label>
          </div>
        </section>

        <section className="rounded-[24px] border border-black/7 bg-white p-5 shadow-[0_12px_35px_rgba(17,17,17,.05)] sm:p-7">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#d71920]">Storefront design</p>
          <h2 className="mt-2 text-xl font-black">Choose your visual system</h2>

          <label className="mt-6 block text-[10px] font-black uppercase tracking-[.1em] text-black/55">Homepage design</label>
          <div className="mt-2 grid gap-2">
            {[
              ["MODERN", "Modern", "Bold ecommerce layout with large visuals."],
              ["CLASSIC", "Classic", "Structured retail layout with clear navigation."],
              ["MINIMAL", "Minimal", "Clean product-first storefront."],
            ].map(([value, label, description]) => (
              <button key={value} type="button" onClick={() => setTemplate(value)} className={`rounded-2xl border p-4 text-left transition ${template === value ? "border-[#d71920] bg-[#fff5f5]" : "border-black/8 bg-white hover:border-black/15"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black">{label}</p>
                    <p className="mt-1 text-[10px] leading-4 text-black/40">{description}</p>
                  </div>
                  <span className={`grid size-6 place-items-center rounded-full border ${template === value ? "border-[#d71920] bg-[#d71920] text-white" : "border-black/12 text-transparent"}`}><Check size={13} /></span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <ColorField label="Primary" value={theme.primaryColor} onChange={(value) => setTheme((t) => ({ ...t, primaryColor: value }))} />
            <ColorField label="Secondary" value={theme.secondaryColor} onChange={(value) => setTheme((t) => ({ ...t, secondaryColor: value }))} />
            <ColorField label="Accent" value={theme.accentColor} onChange={(value) => setTheme((t) => ({ ...t, accentColor: value }))} />
            <ColorField label="Surface" value={theme.surfaceColor} onChange={(value) => setTheme((t) => ({ ...t, surfaceColor: value }))} />
            <ColorField label="Background" value={theme.backgroundColor} onChange={(value) => setTheme((t) => ({ ...t, backgroundColor: value }))} />
            <ColorField label="Text" value={theme.textColor} onChange={(value) => setTheme((t) => ({ ...t, textColor: value }))} />
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-[24px] border border-black/7 bg-white p-5 shadow-[0_12px_35px_rgba(17,17,17,.05)] sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#d71920]">Contact & address</p>
            <h2 className="mt-2 text-xl font-black">Customer-facing information</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Phone" value={profile.phone ?? ""} onChange={(value) => setProfile((p) => ({ ...p, phone: value }))} />
          <Field label="WhatsApp" value={profile.whatsapp ?? ""} onChange={(value) => setProfile((p) => ({ ...p, whatsapp: value }))} />
          <Field label="Email" value={profile.email ?? ""} onChange={(value) => setProfile((p) => ({ ...p, email: value }))} />
          <Field label="Support email" value={profile.supportEmail ?? ""} onChange={(value) => setProfile((p) => ({ ...p, supportEmail: value }))} />
          <Field label="Address line 1" value={profile.addressLine1 ?? ""} onChange={(value) => setProfile((p) => ({ ...p, addressLine1: value }))} />
          <Field label="Address line 2" value={profile.addressLine2 ?? ""} onChange={(value) => setProfile((p) => ({ ...p, addressLine2: value }))} />
          <Field label="City" value={profile.city ?? ""} onChange={(value) => setProfile((p) => ({ ...p, city: value }))} />
          <Field label="District" value={profile.district ?? ""} onChange={(value) => setProfile((p) => ({ ...p, district: value }))} />
          <Field label="Province" value={profile.province ?? ""} onChange={(value) => setProfile((p) => ({ ...p, province: value }))} />
          <Field label="Postal code" value={profile.postalCode ?? ""} onChange={(value) => setProfile((p) => ({ ...p, postalCode: value }))} />
          <Field label="Country" value={profile.country ?? ""} onChange={(value) => setProfile((p) => ({ ...p, country: value }))} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Facebook" value={profile.facebookUrl ?? ""} onChange={(value) => setProfile((p) => ({ ...p, facebookUrl: value }))} />
          <Field label="Instagram" value={profile.instagramUrl ?? ""} onChange={(value) => setProfile((p) => ({ ...p, instagramUrl: value }))} />
          <Field label="TikTok" value={profile.tiktokUrl ?? ""} onChange={(value) => setProfile((p) => ({ ...p, tiktokUrl: value }))} />
          <Field label="YouTube" value={profile.youtubeUrl ?? ""} onChange={(value) => setProfile((p) => ({ ...p, youtubeUrl: value }))} />
        </div>
      </section>

      <section className="mt-6 rounded-[24px] border border-black/7 bg-white p-5 shadow-[0_12px_35px_rgba(17,17,17,.05)] sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#d71920]">Homepage hero</p>
            <h2 className="mt-2 text-xl font-black">Your campaign slides</h2>
            <p className="mt-1 text-[10px] text-black/40">Upload up to 3 images. Every slide belongs to this store.</p>
          </div>
          <span className="rounded-full bg-black px-3 py-1.5 text-[9px] font-black text-white">{heroCountLabel}</span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {heroSlides.map((slide) => (
            <div key={slide.id} className="overflow-hidden rounded-2xl border border-black/8 bg-[#faf9f6]">
              <div className="aspect-[16/8] overflow-hidden bg-black/5">
                <img src={slide.imageUrl} alt={slide.title || "Hero slide"} className="h-full w-full object-cover" />
              </div>
              <div className="space-y-3 p-4">
                <Field label="Eyebrow" value={slide.eyebrow ?? ""} onChange={(value) => setHeroSlides((items) => items.map((item) => item.id === slide.id ? { ...item, eyebrow: value } : item))} />
                <Field label="Title" value={slide.title ?? ""} onChange={(value) => setHeroSlides((items) => items.map((item) => item.id === slide.id ? { ...item, title: value } : item))} />
                <Field label="Accent" value={slide.accentText ?? ""} onChange={(value) => setHeroSlides((items) => items.map((item) => item.id === slide.id ? { ...item, accentText: value } : item))} />
                <Field label="Button text" value={slide.buttonText ?? ""} onChange={(value) => setHeroSlides((items) => items.map((item) => item.id === slide.id ? { ...item, buttonText: value } : item))} />
                <Field label="Button URL" value={slide.buttonUrl ?? ""} onChange={(value) => setHeroSlides((items) => items.map((item) => item.id === slide.id ? { ...item, buttonUrl: value } : item))} />
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => void updateHeroSlide(slide)} disabled={heroBusy} className="flex-1 rounded-xl bg-[#111111] px-3 py-2.5 text-[9px] font-black uppercase tracking-[.1em] text-white hover:bg-[#d71920] disabled:opacity-50">Save slide</button>
                  <button type="button" onClick={() => void removeHeroSlide(slide.id)} disabled={heroBusy} className="grid size-10 place-items-center rounded-xl border border-red-200 bg-red-50 text-[#d71920] hover:bg-[#d71920] hover:text-white disabled:opacity-50"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}

          {heroSlides.length < 3 ? (
            <label className="group flex min-h-[420px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-black/12 bg-[#faf9f6] text-center transition hover:border-[#d71920]/40 hover:bg-[#fff7f7]">
              <div className="grid size-12 place-items-center rounded-2xl bg-white text-black/30 shadow-sm group-hover:text-[#d71920]">
                {heroBusy ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={19} />}
              </div>
              <p className="mt-4 text-xs font-black">Add hero slide</p>
              <p className="mt-1 max-w-[220px] text-[10px] leading-4 text-black/35">Upload JPG, PNG or WebP. Maximum 2 MB.</p>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={addHeroSlide} disabled={heroBusy} />
            </label>
          ) : null}
        </div>
      </section>

      <section className="mt-6 rounded-[24px] border border-black/7 bg-white p-5 shadow-[0_12px_35px_rgba(17,17,17,.05)] sm:p-7">
        <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#d71920]">Commerce</p>
        <h2 className="mt-2 text-xl font-black">Delivery, payments and offers</h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Free delivery threshold" value={settings.freeDeliveryThreshold} onChange={(value) => setSettings((s) => ({ ...s, freeDeliveryThreshold: value }))} type="number" />
          <Field label="Delivery charge" value={settings.deliveryCharge} onChange={(value) => setSettings((s) => ({ ...s, deliveryCharge: value }))} type="number" />
          <Field label="Minimum order" value={settings.minimumOrder} onChange={(value) => setSettings((s) => ({ ...s, minimumOrder: value }))} type="number" />
          <Field label="Hero offer %" value={String(settings.heroOfferPercent)} onChange={(value) => setSettings((s) => ({ ...s, heroOfferPercent: Number(value) || 0 }))} type="number" />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["allowPickup", "Store pickup"],
            ["cashOnDelivery", "Cash on delivery"],
            ["bankTransfer", "Bank transfer"],
            ["cardPayment", "Card payment"],
            ["onlinePayment", "Online payment"],
            ["islandwideDelivery", "Islandwide delivery"],
          ].map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center justify-between rounded-2xl border border-black/7 bg-[#faf9f6] px-4 py-3">
              <span className="text-[11px] font-semibold text-black/70">{label}</span>
              <input type="checkbox" checked={Boolean(settings[key as keyof Settings])} onChange={(event) => setSettings((s) => ({ ...s, [key]: event.target.checked }))} className="size-4 accent-[#d71920]" />
            </label>
          ))}
        </div>
      </section>

      <div className="sticky bottom-4 z-20 mt-6 flex justify-end">
        <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-[#d71920] px-6 py-3.5 text-[10px] font-black uppercase tracking-[.12em] text-white shadow-[0_14px_30px_rgba(215,25,32,.2)] hover:bg-[#111111] disabled:opacity-50">
          {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? "Saving..." : "Save all store settings"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-[9px] font-black uppercase tracking-[.1em] text-black/45">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-black/9 bg-white px-3.5 py-3 text-[11px] outline-none transition focus:border-[#d71920]/45" />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="mt-4 block">
      <span className="text-[9px] font-black uppercase tracking-[.1em] text-black/45">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-1.5 w-full resize-y rounded-xl border border-black/9 bg-white px-3.5 py-3 text-[11px] leading-5 outline-none focus:border-[#d71920]/45" />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="rounded-2xl border border-black/7 bg-[#faf9f6] p-3">
      <span className="block text-[9px] font-black uppercase tracking-[.1em] text-black/40">{label}</span>
      <div className="mt-2 flex items-center gap-2">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="size-9 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
        <input value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[10px] font-mono font-bold uppercase outline-none" />
      </div>
    </label>
  );
}
