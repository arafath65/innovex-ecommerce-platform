"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, ImagePlus, LoaderCircle, RefreshCw, Save, Trash2, Upload, WandSparkles } from "lucide-react";
import { useRouter } from "next/navigation";

type EditorialForm = {
  isEnabled: boolean;
  eyebrow: string;
  title: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  image1Url: string | null;
  image1Alt: string;
  image1Link: string;
  image2Url: string | null;
  image2Alt: string;
  image2Link: string;
  image3Url: string | null;
  image3Alt: string;
  image3Link: string;
  image4Url: string | null;
  image4Alt: string;
  image4Link: string;
};

const EMPTY_FORM: EditorialForm = {
  isEnabled: false,
  eyebrow: "",
  title: "",
  description: "",
  buttonText: "Explore the collection",
  buttonUrl: "/shop",
  image1Url: null,
  image1Alt: "",
  image1Link: "",
  image2Url: null,
  image2Alt: "",
  image2Link: "",
  image3Url: null,
  image3Alt: "",
  image3Link: "",
  image4Url: null,
  image4Alt: "",
  image4Link: "",
};

const IMAGE_SLOTS = [1, 2, 3, 4] as const;

export default function HomepageEditorialClient() {
  const router = useRouter();
  const [form, setForm] = useState<EditorialForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [removingSlot, setRemovingSlot] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadEditorial = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/homepage-editorial", { cache: "no-store" });
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Could not load homepage content.");
      }

      if (data.editorial) {
        setForm({
          ...EMPTY_FORM,
          ...data.editorial,
          image1Alt: data.editorial.image1Alt ?? "",
          image1Link: data.editorial.image1Link ?? "",
          image2Alt: data.editorial.image2Alt ?? "",
          image2Link: data.editorial.image2Link ?? "",
          image3Alt: data.editorial.image3Alt ?? "",
          image3Link: data.editorial.image3Link ?? "",
          image4Alt: data.editorial.image4Alt ?? "",
          image4Link: data.editorial.image4Link ?? "",
        });
      } else {
        setForm(EMPTY_FORM);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load homepage content.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadEditorial(), 0);
    return () => window.clearTimeout(timer);
  }, [loadEditorial]);

  function updateField<K extends keyof EditorialForm>(field: K, value: EditorialForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveEditorial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/homepage-editorial", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Could not save homepage content.");
      }

      setForm((current) => ({
        ...current,
        ...data.editorial,
        image1Alt: data.editorial.image1Alt ?? "",
        image1Link: data.editorial.image1Link ?? "",
        image2Alt: data.editorial.image2Alt ?? "",
        image2Link: data.editorial.image2Link ?? "",
        image3Alt: data.editorial.image3Alt ?? "",
        image3Link: data.editorial.image3Link ?? "",
        image4Alt: data.editorial.image4Alt ?? "",
        image4Link: data.editorial.image4Link ?? "",
      }));
      setSuccess("Homepage editorial section saved successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save homepage content.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(slot: number, file: File) {
    setUploadingSlot(slot);
    setError("");
    setSuccess("");

    try {
      const payload = new FormData();
      payload.set("slot", String(slot));
      payload.set("image", file);

      const response = await fetch("/api/admin/homepage-editorial/images", {
        method: "POST",
        body: payload,
      });
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Could not upload image ${slot}.`);
      }

      setForm((current) => ({
        ...current,
        [`image${slot}Url`]: data.imageUrl,
      }));
      setSuccess(`Image ${slot} uploaded and optimized successfully.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : `Could not upload image ${slot}.`);
    } finally {
      setUploadingSlot(null);
    }
  }

  async function removeImage(slot: number) {
    setRemovingSlot(slot);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/homepage-editorial/images?slot=${slot}`, {
        method: "DELETE",
      });
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Could not remove image ${slot}.`);
      }

      setForm((current) => ({
        ...current,
        [`image${slot}Url`]: null,
      }));
      setSuccess(`Image ${slot} removed.`);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : `Could not remove image ${slot}.`);
    } finally {
      setRemovingSlot(null);
    }
  }

  function handleFileChange(slot: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void uploadImage(slot, file);
    event.target.value = "";
  }

  const uploadedCount = IMAGE_SLOTS.filter((slot) => Boolean(form[`image${slot}Url` as keyof EditorialForm])).length;

  return (
    <div className="admin-page mx-auto max-w-[1180px]">
      <section className="relative overflow-hidden rounded-[28px] bg-[#111111] text-white shadow-[0_28px_70px_rgba(0,0,0,0.10)]">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_45%,rgba(215,25,32,0.28),transparent_65%)]" />
        <div className="absolute left-0 top-0 h-[3px] w-full bg-[#d71920]" />
        <div className="relative px-6 py-7 sm:px-8 sm:py-9">
          <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
            <WandSparkles size={14} className="text-[#d71920]" />
            Storefront content
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Homepage editorial section</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
            Customize the banner wording and upload its four images. These settings belong only to your store.
          </p>
        </div>
      </section>

      {error ? <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-700">{error}</div> : null}
      {success ? <div role="status" className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] font-medium text-emerald-700"><Check size={14} />{success}</div> : null}

      <form onSubmit={saveEditorial} className="mt-6 space-y-6">
        <section className="rounded-[24px] border border-black/7 bg-white p-5 shadow-[0_12px_35px_rgba(17,17,17,0.05)] sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#d71920]">Section visibility</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-black">Show this banner on your storefront</h2>
              <p className="mt-2 max-w-xl text-xs leading-5 text-black/45">The section appears only after all four images are uploaded and the section is enabled.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl bg-[#f7f6f3] px-4 py-3">
              <input
                type="checkbox"
                checked={form.isEnabled}
                onChange={(event) => updateField("isEnabled", event.target.checked)}
                disabled={loading || saving}
                className="size-4 accent-[#d71920]"
              />
              <span className="text-xs font-semibold text-black">Enabled</span>
            </label>
          </div>
        </section>

        <section className="rounded-[24px] border border-black/7 bg-white p-5 shadow-[0_12px_35px_rgba(17,17,17,0.05)] sm:p-7">
          <div className="mb-6">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#d71920]">Editorial copy</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-black">Text and call to action</h2>
            <p className="mt-2 text-xs leading-5 text-black/45">Use wording that matches your store and the products you sell.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-black/55">Small heading</span>
              <input value={form.eyebrow} maxLength={120} onChange={(event) => updateField("eyebrow", event.target.value)} disabled={loading || saving} placeholder="e.g. Everyday, elevated" className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#d71920]/50" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-black/55">Main heading</span>
              <input value={form.title} maxLength={240} onChange={(event) => updateField("title", event.target.value)} disabled={loading || saving} placeholder="Your main banner heading" className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#d71920]/50" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-black/55">Description</span>
              <textarea value={form.description} maxLength={600} rows={3} onChange={(event) => updateField("description", event.target.value)} disabled={loading || saving} placeholder="A short description for your customers" className="mt-2 w-full resize-y rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#d71920]/50" />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-black/55">Button label</span>
              <input value={form.buttonText} maxLength={100} onChange={(event) => updateField("buttonText", event.target.value)} disabled={loading || saving} placeholder="Explore the collection" className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#d71920]/50" />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-black/55">Button link</span>
              <input value={form.buttonUrl} maxLength={500} onChange={(event) => updateField("buttonUrl", event.target.value)} disabled={loading || saving} placeholder="/shop" className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#d71920]/50" />
              <span className="mt-1 block text-[9px] text-black/35">Use a store-relative path, for example /shop or /shop?category=kitchen.</span>
            </label>
          </div>
        </section>

        <section className="rounded-[24px] border border-black/7 bg-white p-5 shadow-[0_12px_35px_rgba(17,17,17,0.05)] sm:p-7">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#d71920]">Banner gallery</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-black">Upload four images</h2>
              <p className="mt-2 text-xs leading-5 text-black/45">JPG, PNG or WebP. Maximum 10 MB per image. Images are optimized and saved in your store&apos;s separate media folder.</p>
            </div>
            <div className="rounded-xl bg-[#f7f6f3] px-3 py-2 text-[10px] font-semibold text-black/60">{uploadedCount} / 4 uploaded</div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {IMAGE_SLOTS.map((slot) => {
              const url = form[`image${slot}Url` as keyof EditorialForm] as string | null;
              const altField = `image${slot}Alt` as const;
              const linkField = `image${slot}Link` as const;
              const isBusy = uploadingSlot === slot || removingSlot === slot;

              return (
                <div key={slot} className="overflow-hidden rounded-2xl border border-black/8 bg-[#fbfaf8] p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-black/55">Image {slot}</span>
                    <span className={`rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] ${url ? "bg-emerald-50 text-emerald-700" : "bg-black/5 text-black/40"}`}>{url ? "Uploaded" : "Required"}</span>
                  </div>
                  <div className="relative aspect-square overflow-hidden rounded-xl border border-black/5 bg-white">
                    {url ? (
                      <Image src={url} alt={form[altField] || `Editorial image ${slot}`} fill sizes="(max-width: 640px) 100vw, 25vw" unoptimized className="object-contain p-2" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-black/30">
                        <ImagePlus size={30} strokeWidth={1.3} />
                        <span className="text-[10px] font-medium">No image selected</span>
                      </div>
                    )}
                    {isBusy ? <div className="absolute inset-0 grid place-items-center bg-white/75"><LoaderCircle size={24} className="animate-spin text-[#d71920]" /></div> : null}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#111111] px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[#d71920]">
                      <Upload size={13} /> {url ? "Replace" : "Upload"}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={loading || saving || uploadingSlot !== null || removingSlot !== null} onChange={(event) => handleFileChange(slot, event)} />
                    </label>
                    {url ? (
                      <button type="button" onClick={() => void removeImage(slot)} disabled={loading || saving || isBusy} aria-label={`Remove image ${slot}`} className="grid size-9 place-items-center rounded-xl border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-50">
                        {removingSlot === slot ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    ) : null}
                  </div>

                  <label className="mt-3 block">
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-black/45">Image description</span>
                    <input value={form[altField]} maxLength={180} onChange={(event) => updateField(altField, event.target.value)} disabled={loading || saving} placeholder="Describe this image" className="mt-1.5 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[10px] outline-none focus:border-[#d71920]/50" />
                  </label>
                  <label className="mt-3 block">
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-black/45">Optional image link</span>
                    <input value={form[linkField]} maxLength={500} onChange={(event) => updateField(linkField, event.target.value)} disabled={loading || saving} placeholder="/shop or /shop?category=..." className="mt-1.5 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[10px] outline-none focus:border-[#d71920]/50" />
                  </label>
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-black/7 bg-white p-4 shadow-[0_12px_35px_rgba(17,17,17,0.05)] sm:p-5">
          <button type="button" onClick={() => void loadEditorial()} disabled={loading || saving || uploadingSlot !== null || removingSlot !== null} className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-black/60 transition hover:bg-black/5 disabled:opacity-50">
            <RefreshCw size={13} /> Reload
          </button>
          <button type="submit" disabled={loading || saving || uploadingSlot !== null || removingSlot !== null} className="inline-flex items-center gap-2 rounded-xl bg-[#d71920] px-5 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving..." : "Save homepage section"}
          </button>
        </div>
      </form>

      {loading ? <div className="mt-4 text-center text-xs text-black/40">Loading homepage settings...</div> : null}
    </div>
  );
}
