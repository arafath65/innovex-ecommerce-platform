
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  KeyRound,
  Power,
  RefreshCw,
  ShieldCheck,
  UserRound,
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

  const storeId = String(params.storeId ?? "");

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
