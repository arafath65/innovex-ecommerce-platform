
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import {
  Building2,
  Check,
  Lock,
  Pencil,
  Power,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";

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
  users: Array<{
    id: number;
    name: string;
    username: string | null;
    email: string;
    role: "OWNER" | "ADMIN" | "STAFF";
    isActive: boolean;
  }>;
};

const EMPTY_FORM = {
  storeName: "",
  displayName: "",
  adminName: "",
  username: "",
  email: "",
  password: "",
  currency: "LKR",
};

export default function StoresClient() {
  const router = useRouter();

  const [stores, setStores] = useState<Store[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createError, setCreateError] = useState("");
  const [adminError, setAdminError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editingUser, setEditingUser] =
    useState<Store["users"][number] | null>(null);

  const [adminForm, setAdminForm] = useState({
    name: "",
    username: "",
    email: "",
    isActive: true,
  });

  const fieldRefs = useRef<
    Array<HTMLInputElement | HTMLSelectElement | null>
  >([]);

  const loadStores = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ status });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await fetch(
        `/api/super-admin/stores?${params.toString()}`,
        { cache: "no-store" },
      );

      if (response.status === 401) {
        router.push("/super-admin/login");
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load stores.");
      }

      setStores(Array.isArray(data.stores) ? data.stores : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load stores.",
      );
    } finally {
      setLoading(false);
    }
  }, [router, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadStores(), 150);
    return () => window.clearTimeout(timer);
  }, [loadStores]);

  useEffect(() => {
    if (!showCreate) return;

    const frame = window.requestAnimationFrame(() => {
      fieldRefs.current[0]?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [showCreate]);

  function handleFieldKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    if (event.key !== "Enter") return;

    event.preventDefault();

    const nextField = fieldRefs.current[index + 1];

    if (nextField) {
      nextField.focus();
      return;
    }

    event.currentTarget.form?.requestSubmit();
  }

  function setFieldRef(index: number) {
    return (element: HTMLInputElement | HTMLSelectElement | null) => {
      // eslint-disable-next-line react-hooks/refs
      fieldRefs.current[index] = element;
    };
  }

  function validateCreateForm() {
    if (form.password.length < 8) {
      setCreateError("Password must be at least 8 characters.");
      fieldRefs.current[5]?.focus();
      return false;
    }

    setCreateError("");
    return true;
  }

  async function createStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (creating || !validateCreateForm()) return;

    setCreating(true);
    setCreateError("");
    setSuccess("");

    try {
      const response = await fetch("/api/super-admin/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create store.");
      }

      setShowCreate(false);
      setForm(EMPTY_FORM);
      setCreateError("");
      setSuccess(
        `Store ${data.store?.name ?? "created"} successfully.`,
      );

      await loadStores();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create store.",
      );
    } finally {
      setCreating(false);
    }
  }

  function getStoreAdmin(store: Store) {
    return (
      store.users.find((user) => user.role === "OWNER") ??
      store.users.find((user) => user.role === "ADMIN") ??
      null
    );
  }

  async function resetPassword(store: Store) {
    const owner = getStoreAdmin(store);

    if (!owner) {
      setError("No store administrator found.");
      return;
    }

    const password = window.prompt(
      `Enter a new password for ${owner.name} (minimum 8 characters):`,
    );

    if (password === null || password === "") return;

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/super-admin/stores/${store.id}/password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: owner.id,
            newPassword: password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to reset store password.",
        );
      }

      setSuccess(`Password reset successfully for ${owner.name}.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to reset store password.",
      );
    }
  }

  function openEditAdmin(
    store: Store,
    user: Store["users"][number],
  ) {
    setError("");
    setSuccess("");
    setAdminError("");

    setEditingStore(store);
    setEditingUser(user);

    setAdminForm({
      name: user.name,
      username: user.username ?? "",
      email: user.email,
      isActive: user.isActive,
    });
  }

  function closeEditAdmin() {
    if (savingAdmin) return;

    setEditingStore(null);
    setEditingUser(null);
    setAdminError("");
  }

  async function saveAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingStore || !editingUser || savingAdmin) return;

    setSavingAdmin(true);
    setAdminError("");
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/super-admin/stores/${editingStore.id}/users/${editingUser.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: adminForm.name.trim(),
            username: adminForm.username.trim().toLowerCase(),
            email: adminForm.email.trim().toLowerCase(),
            isActive: adminForm.isActive,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to update store administrator.",
        );
      }

      const storeName = editingStore.name;

      setEditingStore(null);
      setEditingUser(null);
      setSuccess(`Administrator for ${storeName} updated successfully.`);

      await loadStores();
    } catch (err) {
      setAdminError(
        err instanceof Error
          ? err.message
          : "Failed to update store administrator.",
      );
    } finally {
      setSavingAdmin(false);
    }
  }

  async function toggleStore(store: Store) {
    const next = !store.isActive;

    const message = next
      ? `Activate ${store.name}?`
      : `Deactivate ${store.name}?`;

    if (!window.confirm(message)) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/super-admin/stores/${store.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: next }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update store.");
      }

      setSuccess(
        `${store.name} is now ${next ? "active" : "inactive"}.`,
      );

      await loadStores();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update store.",
      );
    }
  }

  return (
    <main>
      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#d71920]">
              Platform control
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">
              Stores
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-black/45">
              Provision stores, manage their administrator access, and
              control activation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setCreateError("");
              setShowCreate(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-5 py-3 text-[10px] font-black uppercase tracking-[.12em] text-white shadow-[0_14px_30px_rgba(215,25,32,.16)] transition hover:bg-[#111111]"
          >
            <UserPlus size={14} />
            Create store
          </button>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-700"
          >
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] font-medium text-emerald-700">
            <Check size={14} />
            {success}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 rounded-[24px] border border-black/7 bg-white p-4 sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-black/8 bg-[#faf9f6] px-3.5">
            <Search size={15} className="text-black/30" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search stores..."
              className="min-w-0 flex-1 bg-transparent py-3 text-xs outline-none"
            />
          </div>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-2xl border border-black/8 bg-[#faf9f6] px-4 py-3 text-xs outline-none"
          >
            <option value="ALL">All stores</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <button
            type="button"
            onClick={() => void loadStores()}
            className="grid size-11 shrink-0 place-items-center rounded-2xl border border-black/8 bg-[#faf9f6] text-black/50 hover:text-black"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {loading ? (
            <div className="col-span-full grid min-h-[260px] place-items-center rounded-[24px] border border-black/7 bg-white">
              <RefreshCw className="animate-spin text-[#d71920]" />
            </div>
          ) : null}

          {!loading && stores.length === 0 ? (
            <div className="col-span-full rounded-[24px] border border-dashed border-black/10 bg-white p-12 text-center">
              <Building2 className="mx-auto text-black/20" />
              <p className="mt-4 text-sm font-black">No stores found</p>
            </div>
          ) : null}

          {!loading
            ? stores.map((store) => {
                const owner = getStoreAdmin(store);

                return (
                  <article
                    key={store.id}
                    className="rounded-[24px] border border-black/7 bg-white p-5 shadow-[0_10px_35px_rgba(17,17,17,.045)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="grid size-12 place-items-center rounded-2xl bg-[#111111] text-white">
                          <Building2 size={18} />
                        </div>

                        <div>
                          <h2 className="text-base font-black">
                            {store.name}
                          </h2>

                          <p className="mt-0.5 text-[10px] text-black/35">
                            /{store.slug}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em] ${
                          store.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {store.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-4 gap-2">
                      <Stat label="Products" value={store._count.products} />
                      <Stat
                        label="Categories"
                        value={store._count.categories}
                      />
                      <Stat label="Orders" value={store._count.orders} />
                      <Stat label="Users" value={store._count.users} />
                    </div>

                    {owner ? (
                      <div className="mt-4 rounded-2xl bg-[#faf9f6] p-3">
                        <p className="text-[8px] font-black uppercase tracking-[.12em] text-black/30">
                          Store administrator
                        </p>

                        <p className="mt-1 text-xs font-bold">
                          {owner.name}
                        </p>

                        <p className="mt-0.5 text-[10px] text-black/40">
                          @{owner.username ?? "not-set"} · {owner.email}
                        </p>

                        <p className="mt-1 text-[9px] text-black/40">
                          Account: {owner.isActive ? "Active" : "Inactive"}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl bg-[#faf9f6] p-3 text-xs text-black/45">
                        No store administrator found.
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-[1fr_auto_auto_auto] gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/super-admin/stores/${store.id}`)
                        }
                        className="rounded-xl bg-[#111111] px-3 py-2.5 text-[9px] font-black uppercase tracking-[.1em] text-white transition hover:bg-[#d71920]"
                      >
                        Manage store
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (owner) openEditAdmin(store, owner);
                        }}
                        disabled={!owner}
                        className="grid size-10 place-items-center rounded-xl border border-black/8 bg-[#faf9f6] text-black/45 hover:text-[#d71920] disabled:cursor-not-allowed disabled:opacity-40"
                        title="Edit administrator"
                        aria-label="Edit administrator"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => void resetPassword(store)}
                        disabled={!owner}
                        className="grid size-10 place-items-center rounded-xl border border-black/8 bg-[#faf9f6] text-black/45 hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
                        title="Reset administrator password"
                        aria-label="Reset administrator password"
                      >
                        <Lock size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => void toggleStore(store)}
                        className={`grid size-10 place-items-center rounded-xl ${
                          store.isActive
                            ? "border border-red-200 bg-red-50 text-[#d71920] hover:bg-[#d71920] hover:text-white"
                            : "bg-[#111111] text-white hover:bg-[#d71920]"
                        }`}
                        title={
                          store.isActive ? "Deactivate store" : "Activate store"
                        }
                        aria-label={
                          store.isActive ? "Deactivate store" : "Activate store"
                        }
                      >
                        <Power size={14} />
                      </button>
                    </div>
                  </article>
                );
              })
            : null}
        </div>
      </div>

      {editingStore && editingUser ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-5 backdrop-blur-sm">
          <form
            onSubmit={saveAdmin}
            className="max-h-[90vh] w-full max-w-[520px] overflow-auto rounded-[28px] bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#d71920]">
                  Store administrator
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Edit administrator
                </h2>

                <p className="mt-2 text-xs text-black/45">
                  Update the administrator details for{" "}
                  <span className="font-bold text-black">
                    {editingStore.name}
                  </span>
                  .
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditAdmin}
                disabled={savingAdmin}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-[#111111] text-white transition hover:bg-[#d71920] disabled:opacity-50"
                aria-label="Close edit administrator"
              >
                ×
              </button>
            </div>

            {adminError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] leading-5 text-red-700"
              >
                {adminError}
              </div>
            ) : null}

            <div className="mt-7 grid gap-4">
              <Input
                label="Administrator name"
                value={adminForm.name}
                onChange={(value) =>
                  setAdminForm((current) => ({ ...current, name: value }))
                }
                required
              />

              <Input
                label="Username"
                value={adminForm.username}
                onChange={(value) =>
                  setAdminForm((current) => ({
                    ...current,
                    username: value.toLowerCase(),
                  }))
                }
                required
              />

              <Input
                label="Administrator email"
                type="email"
                value={adminForm.email}
                onChange={(value) =>
                  setAdminForm((current) => ({ ...current, email: value }))
                }
                required
              />

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-black/8 bg-[#faf9f6] p-4">
                <span>
                  <span className="block text-xs font-bold">
                    Administrator account
                  </span>

                  <span className="mt-1 block text-[10px] text-black/45">
                    {adminForm.isActive
                      ? "This account can sign in, provided the store is active."
                      : "This account cannot sign in."}
                  </span>
                </span>

                <input
                  type="checkbox"
                  checked={adminForm.isActive}
                  onChange={(event) =>
                    setAdminForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  className="size-4 accent-[#d71920]"
                />
              </label>
            </div>

            <p className="mt-4 text-[10px] leading-5 text-black/45">
              Saving changes invalidates the administrator&apos;s existing
              sessions. Use the password-reset button to change the password.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeEditAdmin}
                disabled={savingAdmin}
                className="flex-1 rounded-2xl border border-black/10 px-4 py-3.5 text-[10px] font-black uppercase tracking-[.1em] text-black/60 hover:bg-[#faf9f6] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={savingAdmin}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 py-3.5 text-[10px] font-black uppercase tracking-[.1em] text-white transition hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingAdmin ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}

                {savingAdmin ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showCreate ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-5 backdrop-blur-sm">
          <form
            onSubmit={createStore}
            className="max-h-[90vh] w-full max-w-[640px] overflow-auto rounded-[28px] bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#d71920]">
                  New tenant
                </p>

                <h2 className="mt-2 text-2xl font-black">Create store</h2>

                <p className="mt-2 text-xs text-black/40">
                  Creates the store, default configuration, and its first
                  OWNER account.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCreateError("");
                  setShowCreate(false);
                }}
                className="grid size-9 place-items-center rounded-full bg-[#d71920] text-white transition hover:bg-[#111111]"
                aria-label="Close"
                title="Close"
              >
                ×
              </button>
            </div>

            {createError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] leading-5 text-red-700"
              >
                {createError}
              </div>
            ) : null}

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <Input
                label="Store name"
                value={form.storeName}
                onChange={(value) =>
                  setForm((current) => ({ ...current, storeName: value }))
                }
                inputRef={setFieldRef(0)}
                onKeyDown={(event) => handleFieldKeyDown(0, event)}
                required
              />

              <Input
                label="Display name"
                value={form.displayName}
                onChange={(value) =>
                  setForm((current) => ({ ...current, displayName: value }))
                }
                inputRef={setFieldRef(1)}
                onKeyDown={(event) => handleFieldKeyDown(1, event)}
                required
              />

              <Input
                label="Administrator name"
                value={form.adminName}
                onChange={(value) =>
                  setForm((current) => ({ ...current, adminName: value }))
                }
                inputRef={setFieldRef(2)}
                onKeyDown={(event) => handleFieldKeyDown(2, event)}
                required
              />

              <Input
                label="Username"
                value={form.username}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    username: value.toLowerCase(),
                  }))
                }
                inputRef={setFieldRef(3)}
                onKeyDown={(event) => handleFieldKeyDown(3, event)}
                required
              />

              <Input
                label="Administrator email"
                type="email"
                value={form.email}
                onChange={(value) =>
                  setForm((current) => ({ ...current, email: value }))
                }
                inputRef={setFieldRef(4)}
                onKeyDown={(event) => handleFieldKeyDown(4, event)}
                required
              />

              <Input
                label="Temporary password"
                type="password"
                value={form.password}
                onChange={(value) => {
                  setForm((current) => ({ ...current, password: value }));
                  if (createError) setCreateError("");
                }}
                inputRef={setFieldRef(5)}
                onKeyDown={(event) => handleFieldKeyDown(5, event)}
                required
              />

              <label className="block">
                <span className="text-[9px] font-black uppercase tracking-[.1em] text-black/45">
                  Currency
                </span>

                <select
                  ref={setFieldRef(6)}
                  value={form.currency}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      currency: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => handleFieldKeyDown(6, event)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-black/9 bg-white px-3.5 py-3 text-xs outline-none transition focus:border-[#d71920]/45"
                >
                  <option value="LKR">LKR — Sri Lankan Rupee</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="INR">INR — Indian Rupee</option>
                  <option value="AED">AED — UAE Dirham</option>
                  <option value="SAR">SAR — Saudi Riyal</option>
                  <option value="QAR">QAR — Qatari Riyal</option>
                  <option value="KWD">KWD — Kuwaiti Dinar</option>
                  <option value="BHD">BHD — Bahraini Dinar</option>
                  <option value="OMR">OMR — Omani Rial</option>
                  <option value="SGD">SGD — Singapore Dollar</option>
                  <option value="MYR">MYR — Malaysian Ringgit</option>
                  <option value="AUD">AUD — Australian Dollar</option>
                  <option value="CAD">CAD — Canadian Dollar</option>
                </select>
              </label>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-black/7 bg-[#faf9f6] px-3.5 py-3 text-[10px] text-black/45">
              <Lock size={13} />
              The store administrator can change the password after first
              login.
            </div>

            <button
              type="submit"
              disabled={creating}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 py-3.5 text-[10px] font-black uppercase tracking-[.12em] text-white transition hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <UserPlus size={14} />
              )}

              {creating
                ? "Creating store..."
                : "Create store and administrator"}
            </button>
          </form>
        </div>
      ) : null}
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  inputRef,
  onKeyDown,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputRef?: (element: HTMLInputElement | null) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[9px] font-black uppercase tracking-[.1em] text-black/45">
        {label}
      </span>

      <input
        ref={inputRef}
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        className="mt-1.5 w-full rounded-xl border border-black/9 px-3.5 py-3 text-xs outline-none transition focus:border-[#d71920]/45"
      />
    </label>
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
    <div className="rounded-xl bg-[#faf9f6] p-2.5 text-center">
      <p className="text-sm font-black">{value}</p>

      <p className="mt-0.5 text-[8px] uppercase tracking-[.08em] text-black/30">
        {label}
      </p>
    </div>
  );
}
