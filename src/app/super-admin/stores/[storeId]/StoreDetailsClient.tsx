
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  KeyRound,
  Power,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
} from "lucide-react";

type AdminUser = {
  id: number;
  name: string;
  username: string | null;
  email: string;
  role: "OWNER" | "ADMIN" | "STAFF";
  isActive: boolean;
  createdAt: string;
};

type StoreDomain = {
  id: number;
  hostname: string;
  status: "PENDING" | "VERIFIED" | "ACTIVE" | "DISABLED";
  isPrimary: boolean;
  verifiedAt: string | null;
  createdAt: string;
  dnsVerification?: { type: "TXT"; name: string; value: string } | null;
};

type DnsInstructions = {
  hostname: string;
  name: string;
  value: string;
};

type Store = {
  id: number;
  name: string;
  slug: string;
  currency: string;
  isActive: boolean;
  createdAt: string;

  _count: {
    products: number;
    categories: number;
    customers: number;
    orders: number;
    users: number;
  };

  profile: {
    displayName: string | null;
    tagline: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    district: string | null;
  } | null;

  settings: {
    currency: string;
    heroOfferPercent: number;
    freeDeliveryThreshold: unknown;
    deliveryCharge: unknown;
    minimumOrder: unknown;
    allowPickup: boolean;
    cashOnDelivery: boolean;
    bankTransfer: boolean;
    cardPayment: boolean;
    onlinePayment: boolean;
    islandwideDelivery: boolean;
  } | null;

  theme: {
    template?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    mutedColor: string;
    headerStyle: string;
    buttonStyle: string;
  } | null;

  users: AdminUser[];
};

export default function StoreDetailsClient() {
  const params = useParams<{ storeId: string }>();
  const router = useRouter();

  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [domains, setDomains] = useState<StoreDomain[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [domainName, setDomainName] = useState("");
  const [domainBusy, setDomainBusy] = useState(false);
  const [domainError, setDomainError] = useState("");
  const [domainSuccess, setDomainSuccess] = useState("");
  const [dnsInstructions, setDnsInstructions] = useState<DnsInstructions | null>(null);

  const storeId = String(params.storeId ?? "");

  const fetchDomains = useCallback(async (): Promise<StoreDomain[]> => {
    if (!storeId) return [];

    const response = await fetch(`/api/super-admin/stores/${storeId}/domains`, {
      cache: "no-store",
    });

    if (response.status === 401) {
      router.push("/super-admin/login");
      return [];
    }

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to load store domains.");
    }

    return Array.isArray(data.domains) ? data.domains : [];
  }, [router, storeId]);

  const loadDomains = useCallback(async () => {
    setDomainsLoading(true);
    try {
      setDomains(await fetchDomains());
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : "Failed to load domains.");
    } finally {
      setDomainsLoading(false);
    }
  }, [fetchDomains]);

  useEffect(() => {
    let cancelled = false;

    void fetchDomains()
      .then((nextDomains) => {
        if (!cancelled) setDomains(nextDomains);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDomainError(
            err instanceof Error ? err.message : "Failed to load domains.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDomainsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchDomains]);

  async function addDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!domainName.trim() || domainBusy) return;
    setDomainBusy(true);
    setDomainError("");
    setDomainSuccess("");
    setDnsInstructions(null);
    try {
      const response = await fetch(`/api/super-admin/stores/${storeId}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname: domainName.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Could not add domain.");
      }
      setDomainName("");
      if (data.dnsVerification) {
        setDnsInstructions({
          hostname: data.domain.hostname,
          name: data.dnsVerification.name,
          value: data.dnsVerification.value,
        });
      }
      setDomainSuccess(data.message || "Domain added.");
      await loadDomains();
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : "Could not add domain.");
    } finally {
      setDomainBusy(false);
    }
  }

  async function runDomainAction(
    domain: StoreDomain,
    action: "verify" | "activate" | "disable" | "primary" | "delete",
  ) {
    if (domainBusy) return;
    if (action === "delete" && !window.confirm(`Remove ${domain.hostname} from ${store?.name ?? "this store"}?`)) return;
    if (action === "activate" && !window.confirm(`Activate ${domain.hostname}? Ensure HTTPS is already configured for this hostname.`)) return;

    setDomainBusy(true);
    setDomainError("");
    setDomainSuccess("");
    try {
      let response: Response;
      if (action === "verify") {
        response = await fetch(`/api/super-admin/stores/${storeId}/domains/${domain.id}/verify`, {
          method: "POST",
        });
      } else if (action === "delete") {
        response = await fetch(`/api/super-admin/stores/${storeId}/domains?domainId=${domain.id}`, {
          method: "DELETE",
        });
      } else {
        response = await fetch(`/api/super-admin/stores/${storeId}/domains`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            action === "activate"
              ? { domainId: domain.id, status: "ACTIVE" }
              : action === "disable"
                ? { domainId: domain.id, status: "DISABLED" }
                : { domainId: domain.id, isPrimary: true },
          ),
        });
      }
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || data.error || "Domain action failed.");
      }
      setDomainSuccess(
        action === "verify" ? "Domain ownership verified. Configure HTTPS, then activate the domain." :
        action === "activate" ? "Domain activated." :
        action === "disable" ? "Domain disabled." :
        action === "primary" ? "Primary domain updated." : "Domain removed.",
      );
      await loadDomains();
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : "Domain action failed.");
    } finally {
      setDomainBusy(false);
    }
  }

  useEffect(() => {
    if (!storeId) {
      return;
    }

    let cancelled = false;

    fetch(`/api/super-admin/stores/${storeId}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 401) {
          router.push("/super-admin/login");
          return null;
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "Failed to load store.",
          );
        }

        return data;
      })
      .then((data) => {
        if (cancelled || !data) {
          return;
        }

        setStore(data.store);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load store.",
        );
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router, storeId]);

  async function toggleStore() {
    if (!store) {
      return;
    }

    const next = !store.isActive;

    const confirmed = window.confirm(
      `${next ? "Activate" : "Deactivate"} ${store.name}?`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/super-admin/stores/${store.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: next,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to update store.",
        );
      }

      setStore((current) =>
        current
          ? {
              ...current,
              isActive: next,
            }
          : current,
      );

      setSuccess(
        `${store.name} is now ${
          next ? "active" : "inactive"
        }.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update store.",
      );
    }
  }

  async function resetPassword() {
    if (!store) {
      return;
    }

    const password = window.prompt(
      `New password for ${store.name} administrator (minimum 8 characters):`,
    );

    if (!password) {
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters.",
      );
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/super-admin/stores/${store.id}/password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            newPassword: password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to reset password.",
        );
      }

      setSuccess(
        `Administrator password reset successfully for ${store.name}.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to reset password.",
      );
    }
  }

  if (loading) {
    return (
      <main className="mx-auto grid min-h-[70vh] max-w-[1440px] place-items-center px-5 sm:px-8 lg:px-10">
        <RefreshCw
          className="animate-spin text-[#d71920]"
          size={22}
        />
      </main>
    );
  }

  if (!store) {
    return (
      <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
        <Link
          href="/super-admin/stores"
          className="inline-flex items-center gap-2 text-xs font-bold text-black/50 hover:text-black"
        >
          <ArrowLeft size={14} />
          Back to stores
        </Link>

        <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error || "Store not found."}
        </div>
      </main>
    );
  }

  const owner =
    store.users.find(
      (user) => user.role === "OWNER",
    ) ??
    store.users[0] ??
    null;

  return (
    <main>
      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
        <Link
          href="/super-admin/stores"
          className="inline-flex items-center gap-2 text-xs font-bold text-black/45 hover:text-black"
        >
          <ArrowLeft size={14} />
          Back to stores
        </Link>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] font-medium text-emerald-700">
            <Check size={14} />
            {success}
          </div>
        ) : null}

        <section className="mt-6 rounded-[28px] border border-black/7 bg-white p-6 shadow-[0_18px_55px_rgba(17,17,17,.05)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#111111] text-white">
                <Building2 size={22} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-[-.035em] sm:text-3xl">
                    {store.name}
                  </h1>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em] ${
                      store.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {store.isActive
                      ? "Active"
                      : "Inactive"}
                  </span>
                </div>

                <p className="mt-1 text-xs text-black/35">
                  /{store.slug} · {store.currency}
                </p>

                <p className="mt-3 max-w-2xl text-sm text-black/45">
                  This is the platform-level control view for
                  the tenant. Store-specific administration will
                  be handled from the client store console.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void toggleStore()}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[9px] font-black uppercase tracking-[.1em] ${
                  store.isActive
                    ? "border border-red-200 bg-red-50 text-[#d71920] hover:bg-[#d71920] hover:text-white"
                    : "bg-[#111111] text-white hover:bg-[#d71920]"
                }`}
              >
                <Power size={14} />

                {store.isActive
                  ? "Deactivate"
                  : "Activate"}
              </button>

              {owner ? (
                <button
                  type="button"
                  onClick={() =>
                    void resetPassword()
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-black/8 bg-[#faf9f6] px-4 py-2.5 text-[9px] font-black uppercase tracking-[.1em] text-black/55 hover:text-black"
                >
                  <KeyRound size={14} />
                  Reset password
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat
            label="Products"
            value={store._count.products}
          />

          <Stat
            label="Categories"
            value={store._count.categories}
          />

          <Stat
            label="Customers"
            value={store._count.customers}
          />

          <Stat
            label="Orders"
            value={store._count.orders}
          />

          <Stat
            label="Store users"
            value={store._count.users}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-[24px] border border-black/7 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-[#111111] text-white">
                <UserRound size={16} />
              </div>

              <div>
                <h2 className="text-base font-black">
                  Store administrator
                </h2>

                <p className="text-[10px] text-black/35">
                  Primary account provisioned by Super Admin
                </p>
              </div>
            </div>

            {owner ? (
              <div className="mt-5 space-y-3 text-xs">
                <Row
                  label="Name"
                  value={owner.name}
                />

                <Row
                  label="Username"
                  value={
                    owner.username
                      ? `@${owner.username}`
                      : "Not set"
                  }
                />

                <Row
                  label="Email"
                  value={owner.email}
                />

                <Row
                  label="Role"
                  value={owner.role}
                />

                <Row
                  label="Status"
                  value={
                    owner.isActive
                      ? "Active"
                      : "Inactive"
                  }
                />
              </div>
            ) : (
              <p className="mt-5 rounded-2xl bg-red-50 p-4 text-xs text-red-700">
                No store administrator account exists.
              </p>
            )}
          </section>

          <section className="rounded-[24px] border border-black/7 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-[#d71920] text-white">
                <ShieldCheck size={16} />
              </div>

              <div>
                <h2 className="text-base font-black">
                  Store configuration
                </h2>

                <p className="text-[10px] text-black/35">
                  Platform-visible tenant configuration
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-xs">
              <Row
                label="Display name"
                value={
                  store.profile?.displayName ??
                  store.name
                }
              />

              <Row
                label="Tagline"
                value={
                  store.profile?.tagline ??
                  "Not set"
                }
              />

              <Row
                label="Contact"
                value={
                  store.profile?.phone ??
                  store.profile?.email ??
                  "Not set"
                }
              />

              <Row
                label="Location"
                value={
                  [
                    store.profile?.city,
                    store.profile?.district,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Not set"
                }
              />

              <Row
                label="Template"
                value={
                  store.theme?.template ??
                  "MODERN"
                }
              />

              <Row
                label="Primary color"
                value={
                  store.theme?.primaryColor ??
                  "Not set"
                }
              />
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-[24px] border border-black/7 bg-white p-6 shadow-[0_12px_35px_rgba(17,17,17,.035)] sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-[#111111] text-white">
                <Globe size={16} />
              </div>
              <div>
                <h2 className="text-base font-black">Store domains</h2>
                <p className="text-[10px] text-black/40">Connect local test hostnames or a customer-owned domain.</p>
              </div>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-[.12em] text-black/35">Only active domains load this storefront</span>
          </div>

          {domainError ? (
            <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[11px] text-red-700">{domainError}</div>
          ) : null}
          {domainSuccess ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] text-emerald-700">{domainSuccess}</div>
          ) : null}

          {dnsInstructions ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-black text-amber-900">DNS verification for {dnsInstructions.hostname}</p>
              <p className="mt-1 text-[10px] leading-5 text-amber-900/70">Add this TXT record at the domain&apos;s DNS provider. Verify ownership after DNS changes are visible.</p>
              <div className="mt-3 grid gap-2 text-[10px] sm:grid-cols-[90px_1fr]">
                <span className="font-bold text-amber-900/60">Record name</span>
                <code className="break-all rounded-lg bg-white/80 px-2 py-2 text-amber-950">{dnsInstructions.name}</code>
                <span className="font-bold text-amber-900/60">TXT value</span>
                <code className="break-all rounded-lg bg-white/80 px-2 py-2 text-amber-950">{dnsInstructions.value}</code>
              </div>
              <button type="button" onClick={() => void navigator.clipboard.writeText(`${dnsInstructions.name}
${dnsInstructions.value}`)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] text-white">
                <Copy size={12} /> Copy DNS details
              </button>
            </div>
          ) : null}

          <form onSubmit={addDomain} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <input
              value={domainName}
              onChange={(event) => setDomainName(event.target.value)}
              placeholder="oscar-trading.test or shop.customer-domain.com"
              className="min-w-0 flex-1 rounded-xl border border-black/10 bg-[#faf9f6] px-4 py-3 text-xs outline-none focus:border-[#d71920]"
              autoComplete="off"
            />
            <button type="submit" disabled={domainBusy || !domainName.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d71920] px-4 py-3 text-[9px] font-black uppercase tracking-[.1em] text-white disabled:cursor-not-allowed disabled:opacity-50">
              <Plus size={13} /> Add domain
            </button>
          </form>

          <div className="mt-5 space-y-2">
            {domainsLoading ? (
              <div className="flex items-center gap-2 py-5 text-xs text-black/40"><RefreshCw size={14} className="animate-spin" /> Loading domains...</div>
            ) : domains.length === 0 ? (
              <p className="rounded-xl border border-dashed border-black/10 p-5 text-center text-xs text-black/40">No domains connected yet.</p>
            ) : domains.map((domain) => (
              <div key={domain.id} className="flex flex-col gap-3 rounded-2xl border border-black/7 bg-[#faf9f6] p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-all text-xs font-black">{domain.hostname}</span>
                    {domain.isPrimary ? <span className="rounded-full bg-[#111111] px-2 py-1 text-[8px] font-black uppercase tracking-[.1em] text-white">Primary</span> : null}
                    <span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-[.1em] ${domain.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : domain.status === "VERIFIED" ? "bg-blue-100 text-blue-700" : domain.status === "DISABLED" ? "bg-gray-200 text-gray-600" : "bg-amber-100 text-amber-700"}`}>{domain.status}</span>
                  </div>
                  <a href={domain.hostname.endsWith(".test") ? `http://${domain.hostname}:3000` : `https://${domain.hostname}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[9px] text-black/40 hover:text-[#d71920]">
                    Local preview / open domain <ExternalLink size={10} />
                  </a>
                </div>
                <div className="flex flex-wrap gap-2">
                  {domain.status === "PENDING" && domain.dnsVerification ? <button type="button" onClick={() => setDnsInstructions({ hostname: domain.hostname, name: domain.dnsVerification!.name, value: domain.dnsVerification!.value })} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[8px] font-black uppercase tracking-[.1em] text-amber-900">Show TXT record</button> : null}
                  {domain.status === "PENDING" ? <button type="button" disabled={domainBusy} onClick={() => void runDomainAction(domain, "verify")} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[8px] font-black uppercase tracking-[.1em] disabled:opacity-40">Verify DNS</button> : null}
                  {domain.status === "VERIFIED" ? <button type="button" disabled={domainBusy} onClick={() => void runDomainAction(domain, "activate")} className="rounded-lg bg-emerald-700 px-3 py-2 text-[8px] font-black uppercase tracking-[.1em] text-white disabled:opacity-40">Activate</button> : null}
                  {domain.status === "ACTIVE" && !domain.isPrimary ? <button type="button" disabled={domainBusy} onClick={() => void runDomainAction(domain, "primary")} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[8px] font-black uppercase tracking-[.1em] disabled:opacity-40">Make primary</button> : null}
                  {domain.status === "ACTIVE" ? <button type="button" disabled={domainBusy} onClick={() => void runDomainAction(domain, "disable")} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[8px] font-black uppercase tracking-[.1em] text-amber-800 disabled:opacity-40">Disable</button> : null}
                  <button type="button" disabled={domainBusy} onClick={() => void runDomainAction(domain, "delete")} className="grid size-8 place-items-center rounded-lg border border-red-200 bg-red-50 text-red-600 disabled:opacity-40" title="Remove domain" aria-label={`Remove ${domain.hostname}`}><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[9px] leading-5 text-black/40">For production domains, complete DNS TXT verification and configure HTTPS in CloudPanel before activating the domain. Local .test hostnames are activated automatically during development.</p>
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[22px] border border-black/7 bg-white p-4 text-center">
      <p className="text-xl font-black tracking-[-.03em]">
        {value}
      </p>

      <p className="mt-1 text-[8px] font-black uppercase tracking-[.12em] text-black/30">
        {label}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-black/6 pb-3 last:border-0 last:pb-0">
      <span className="text-[9px] font-black uppercase tracking-[.1em] text-black/30">
        {label}
      </span>

      <span className="max-w-[65%] text-right font-semibold text-black/70">
        {value}
      </span>
    </div>
  );
}
