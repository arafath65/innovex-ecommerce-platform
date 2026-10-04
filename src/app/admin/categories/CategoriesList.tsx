"use client";

import {
  AlertCircle,
  Check,
  ChevronRight,
  Folder,
  FolderTree,
  Layers3,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Save,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

type Subcategory = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  isActive: boolean;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  children: Subcategory[];
};

const RED = "#d71920";

export default function CategoriesList() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<{
    id: number;
    name: string;
    parentId: string;
    isMain: boolean;
  } | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    id: number;
    label: string;
    isMain: boolean;
    children: Subcategory[];
  } | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/categories?includeInactive=true",
        { cache: "no-store" },
      );

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data: unknown = await response.json();

      if (!response.ok) {
        const responseData =
          data && typeof data === "object"
            ? (data as Record<string, unknown>)
            : {};

        throw new Error(
          typeof responseData.error === "string"
            ? responseData.error
            : "Failed to load categories.",
        );
      }

      const responseData =
        data && typeof data === "object"
          ? (data as Record<string, unknown>)
          : {};

      setCategories(
        Array.isArray(responseData.categories)
          ? (responseData.categories as Category[])
          : [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load categories.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
  const timer = window.setTimeout(() => {
    void loadCategories();
  }, 0);

  return () => {
    window.clearTimeout(timer);
  };
}, [loadCategories]);

  const stats = useMemo(() => {
    const subcategories = categories.reduce(
      (total, category) => total + category.children.length,
      0,
    );

    const activeMain = categories.filter(
      (category) => category.isActive,
    ).length;

    const activeSubcategories = categories.reduce(
      (total, category) =>
        total + category.children.filter((child) => child.isActive).length,
      0,
    );

    const withSubcategories = categories.filter(
      (category) => category.children.length > 0,
    ).length;

    return {
      total: categories.length + subcategories,
      main: categories.length,
      subcategories,
      withSubcategories,
      active: activeMain + activeSubcategories,
      inactive:
        categories.length + subcategories - activeMain - activeSubcategories,
    };
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (statusFilter === "all") {
      return categories;
    }

    const wantActive = statusFilter === "active";

    return categories
      .filter((category) => category.isActive === wantActive)
      .map((category) => ({
        ...category,
        children: category.children.filter(
          (child) => child.isActive === wantActive,
        ),
      }));
  }, [categories, statusFilter]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Please enter a category name.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          parentId: parentId || null,
        }),
      });

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data: unknown = await response.json();

      if (!response.ok) {
        const responseData =
          data && typeof data === "object"
            ? (data as Record<string, unknown>)
            : {};

        throw new Error(
          typeof responseData.error === "string"
            ? responseData.error
            : "Failed to create category.",
        );
      }

      const wasSubcategory = Boolean(parentId);

      setName("");
      setParentId("");
      setMessage(
        wasSubcategory
          ? "Subcategory created successfully."
          : "Category created successfully.",
      );

      await loadCategories();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create category.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openEditCategory(category: Category) {
    if (!category.isActive) {
      return;
    }

    setError("");
    setMessage("");
    setEditing({
      id: category.id,
      name: category.name,
      parentId: "",
      isMain: true,
    });
  }

  function openEditSubcategory(
    child: Subcategory,
    parentCategoryId: number,
  ) {
    if (!child.isActive) {
      return;
    }

    setError("");
    setMessage("");
    setEditing({
      id: child.id,
      name: child.name,
      parentId: String(parentCategoryId),
      isMain: false,
    });
  }

  function closeEdit() {
    if (editSaving) {
      return;
    }
    setEditing(null);
  }

  async function handleEditSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!editing) {
      return;
    }

    const currentCategory = categories.flatMap((category) => [
      category,
      ...category.children,
    ]).find((item) => item.id === editing.id);

    if (currentCategory && !currentCategory.isActive) {
      setEditing(null);
      setError("Inactive categories cannot be edited. Activate it first.");
      return;
    }

    const trimmedName = editing.name.trim();

    if (!trimmedName) {
      setError("Please enter a category name.");
      return;
    }

    setEditSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editing.id,
          name: trimmedName,
          parentId: editing.parentId || null,
        }),
      });

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data: unknown = await response.json();

      if (!response.ok) {
        const responseData =
          data && typeof data === "object"
            ? (data as Record<string, unknown>)
            : {};

        throw new Error(
          typeof responseData.error === "string"
            ? responseData.error
            : "Failed to update category.",
        );
      }

      setEditing(null);
      setMessage(
        editing.parentId
          ? "Subcategory updated successfully."
          : "Category updated successfully.",
      );
      await loadCategories();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update category.",
      );
    } finally {
      setEditSaving(false);
    }
  }

  async function activateCategory(
    id: number,
    label: string,
  ) {
    setDeletingId(id);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          action: "activate",
        }),
      });

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data: unknown = await response.json();

      if (!response.ok) {
        const responseData =
          data && typeof data === "object"
            ? (data as Record<string, unknown>)
            : {};

        throw new Error(
          typeof responseData.error === "string"
            ? responseData.error
            : "Failed to activate category.",
        );
      }

      setMessage(`${label} activated successfully.`);
      await loadCategories();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to activate category.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function requestDelete(
    id: number,
    label: string,
    isMain: boolean,
    children: Subcategory[] = [],
  ) {
    setError("");
    setMessage("");
    setDeleteConfirmation({
      id,
      label,
      isMain,
      children,
    });
  }

  function closeDeleteConfirmation() {
    if (deletingId !== null) {
      return;
    }
    setDeleteConfirmation(null);
  }

  async function confirmDelete() {
    if (!deleteConfirmation) {
      return;
    }

    const target = deleteConfirmation;
    setDeletingId(target.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/categories", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: target.id,
          cascadeChildren: target.isMain && target.children.length > 0,
        }),
      });

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data: unknown = await response.json();

      if (!response.ok) {
        const responseData =
          data && typeof data === "object"
            ? (data as Record<string, unknown>)
            : {};

        throw new Error(
          typeof responseData.error === "string"
            ? responseData.error
            : "Failed to deactivate category.",
        );
      }

      setDeleteConfirmation(null);
      setMessage(
        target.isMain && target.children.length > 0
          ? `${target.label} and its subcategories were deactivated.`
          : `${target.label} was deactivated.`,
      );
      await loadCategories();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to deactivate category.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  return (
    <main className="min-h-full w-full bg-[#f5f5f3]">
      <div className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* HEADER */}
        <div className="products-header mb-5 flex flex-col gap-4 border-b border-black/7 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/35">
              <span>Catalog</span>
              <span className="text-black/15">/</span>
              <span className="text-[#d71920]">Categories</span>
            </div>

            <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-black">
              Categories
            </h1>

            <p className="mt-1 text-[12px] text-black/43">
              Manage your Oscar Trading category structure and subcategories.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              document
                .getElementById("category-creator")
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
              document.getElementById("categoryName")?.focus();
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#d71920] px-4 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#c5151c]"
          >
            <Plus size={15} strokeWidth={2.2} />
            Add category
          </button>
        </div>

        {/* STATS */}
        <section className="mb-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total categories"
            value={stats.total}
            icon={Layers3}
            tone="neutral"
          />
          <StatCard
            label="Main categories"
            value={stats.main}
            icon={FolderTree}
            tone="red"
          />
          <StatCard
            label="Subcategories"
            value={stats.subcategories}
            icon={Folder}
            tone="neutral"
          />
          <StatCard
            label="With subcategories"
            value={stats.withSubcategories}
            icon={Tag}
            tone="dark"
          />
        </section>

        {/* CATEGORY CREATOR */}
        <section
          id="category-creator"
          className="mb-5 overflow-hidden rounded-[20px] border border-black/8 bg-white shadow-[0_10px_26px_rgba(0,0,0,0.045)]"
        >
          <div className="border-b border-black/8 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#111111] text-[#ff4f56] shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
                <Plus size={18} strokeWidth={2.2} />
              </span>

              <div>
                <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-[0.16em]">
                  <span className="text-[#d71920]">Catalog setup</span>
                  <span className="text-black/15">•</span>
                  <span className="text-black/25">New category</span>
                </div>
                <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-black/80">
                  Create category
                </h2>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr_auto] lg:items-end">
              <Field label="Category / subcategory name" required>
                <div className="relative">
                  <Tag
                    size={14}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#d71920]/55"
                  />
                  <input
                    id="categoryName"
                    type="text"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      if (error || message) {
                        clearFeedback();
                      }
                    }}
                    placeholder="e.g. Kitchenware or Cookware"
                    maxLength={120}
                    required
                    className="h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] pl-10 pr-3 text-[11px] text-black outline-none transition focus:border-[#d71920]/45 focus:bg-white focus:ring-4 focus:ring-[#d71920]/9"
                  />
                </div>
                <p className="mt-1.5 text-[8px] text-black/26">
                  Maximum 120 characters.
                </p>
              </Field>

              <Field label="Parent category">
                <select
                  id="parentCategory"
                  value={parentId}
                  onChange={(event) => {
                    setParentId(event.target.value);
                    if (error || message) {
                      clearFeedback();
                    }
                  }}
                  className="h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-[11px] text-black outline-none transition focus:border-[#d71920]/45 focus:bg-white focus:ring-4 focus:ring-[#d71920]/9"
                >
                  <option value="">None — Main category</option>
                  {categories
                    .filter((category) => category.isActive)
                    .map((category) => (
                      <option key={category.id} value={String(category.id)}>
                        {category.name}
                      </option>
                    ))}
                </select>
                <p className="mt-1.5 text-[8px] text-black/26">
                  {parentId
                    ? "This will be created under the selected category."
                    : "Leave empty to create a main category."}
                </p>
              </Field>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#d71920] px-5 text-[11px] font-bold text-white shadow-[0_10px_22px_rgba(215,25,32,0.22)] transition hover:bg-[#c4161d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                {saving
                  ? "Saving..."
                  : parentId
                    ? "Create subcategory"
                    : "Create category"}
              </button>
            </div>

            {(error || message) && (
              <div
                className={`mt-4 flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 ${
                  error
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
                role="status"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {error ? <AlertCircle size={14} /> : <Check size={14} />}
                  <span className="text-[9px] font-medium leading-5">
                    {error || message}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={clearFeedback}
                  className="grid size-6 shrink-0 place-items-center rounded-md transition hover:bg-black/5"
                  aria-label="Dismiss message"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </form>
        </section>

        {/* CATEGORY DIRECTORY */}
        <section className="overflow-hidden rounded-[22px] border border-black/8 bg-white shadow-[0_14px_34px_rgba(0,0,0,0.045)]">
          <div className="flex flex-col gap-4 border-b border-black/8 px-5 py-4.5 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#fff1f2] text-[#d71920] ring-1 ring-[#d71920]/10">
                <FolderTree size={17} strokeWidth={2.1} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[14px] font-semibold tracking-[-0.015em] text-black/80">
                    Category directory
                  </h2>
                  <span className="rounded-full bg-[#111111] px-2 py-1 text-[7px] font-bold uppercase tracking-[0.12em] text-white/80">
                    Catalog
                  </span>
                </div>
                <p className="mt-1 text-[9px] text-black/31">
                  {stats.main} main {stats.main === 1 ? "category" : "categories"}
                  <span className="mx-1.5 text-black/14">•</span>
                  {stats.subcategories} {stats.subcategories === 1 ? "subcategory" : "subcategories"}
                  <span className="mx-1.5 text-black/14">•</span>
                  {stats.active} active
                  <span className="mx-1.5 text-black/14">•</span>
                  {stats.inactive} inactive
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "active" | "inactive" | "all",
                  )
                }
                className="h-9 rounded-lg border border-black/9 bg-white px-3 text-[9px] font-semibold text-black/55 outline-none transition focus:border-[#d71920]/30 focus:ring-2 focus:ring-[#d71920]/8"
                aria-label="Filter categories by status"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="all">All</option>
              </select>

              <button
                type="button"
                onClick={() => void loadCategories()}
              disabled={loading}
              className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-lg border border-black/9 bg-white px-3.5 text-[9px] font-semibold text-black/54 transition hover:border-[#d71920]/20 hover:bg-[#fff9f9] hover:text-[#d71920] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-16 text-center sm:px-6">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#111111] text-white">
                <RefreshCw size={18} className="animate-spin" />
              </div>
              <p className="mt-3 text-[10px] font-medium text-black/35">
                Loading category structure...
              </p>
            </div>
          ) : error && categories.length === 0 ? (
            <div className="px-5 py-16 text-center sm:px-6">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-50 text-red-500">
                <AlertCircle size={18} />
              </div>
              <p className="mx-auto mt-3 max-w-md text-[10px] font-semibold leading-5 text-red-600">
                {error}
              </p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="px-5 py-16 text-center sm:px-6">
              <div className="mx-auto grid size-14 place-items-center rounded-[18px] bg-[#111111] text-white shadow-[0_10px_24px_rgba(0,0,0,0.10)]">
                <FolderTree size={22} />
              </div>
              <h3 className="mt-4 text-[14px] font-semibold tracking-[-0.015em] text-black/72">
                {statusFilter === "all"
                  ? "No categories yet"
                  : statusFilter === "active"
                    ? "No active categories"
                    : "No inactive categories"}
              </h3>
              <p className="mx-auto mt-1.5 max-w-md text-[10px] leading-5 text-black/32">
                {statusFilter === "all"
                  ? "Start with a main category above. Once it exists, select it as the parent to create subcategories."
                  : statusFilter === "active"
                    ? "There are no active categories in the current view."
                    : "There are no inactive categories in the current view."}
              </p>
              <button
                type="button"
                onClick={() => {
                  document.getElementById("categoryName")?.focus();
                }}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-[#d71920] px-3.5 text-[9px] font-bold text-white transition hover:bg-[#c4161d]"
              >
                <Plus size={12} />
                Create first category
              </button>
            </div>
          ) : (
            <div className="grid gap-4 bg-[#fafafa] p-4 sm:p-5 lg:grid-cols-2">
              {filteredCategories.map((category, index) => (
                <article
                  key={category.id}
                  className={`group overflow-hidden rounded-2xl border bg-white shadow-[0_8px_22px_rgba(0,0,0,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(0,0,0,0.07)] ${
                    category.isActive
                      ? "border-black/8 hover:border-[#d71920]/18"
                      : "border-black/10 opacity-90"
                  }`}
                >
                  <div className="relative overflow-hidden bg-[#111111] px-4 py-4">
                    <div className="absolute right-0 top-0 h-full w-28 bg-[radial-gradient(circle_at_70%_40%,rgba(215,25,32,0.25),transparent_66%)]" />
                    <div className="relative flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d71920] text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)]">
                        <Folder size={18} strokeWidth={2} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-bold tracking-[0.12em] text-white/30">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <h3 className="truncate text-[13px] font-semibold text-white">
                            {category.name}
                          </h3>
                        </div>
                        <p className="mt-1 truncate text-[8px] text-white/35">
                          /{category.slug}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={`rounded-full border px-2 py-1 text-[7px] font-bold uppercase tracking-[0.1em] ${
                            category.isActive
                              ? "border-[#d71920]/30 bg-[#d71920]/10 text-[#ff6b71]"
                              : "border-white/10 bg-white/[0.06] text-white/45"
                          }`}
                        >
                          {category.isActive ? "Active" : "Inactive"}
                        </span>
                        {category.isActive ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditCategory(category)}
                              className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-white/55 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                              aria-label={`Edit ${category.name}`}
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                requestDelete(
                                  category.id,
                                  `main category “${category.name}”`,
                                  true,
                                  category.children,
                                )
                              }
                              disabled={deletingId === category.id}
                              className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-white/40 transition hover:border-red-400/40 hover:bg-[#d71920] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Deactivate ${category.name}`}
                            >
                              {deletingId === category.id ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                <Trash2 size={12} />
                              )}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              void activateCategory(
                                category.id,
                                `Main category “${category.name}”`,
                              )
                            }
                            disabled={deletingId === category.id}
                            className="grid size-8 place-items-center rounded-lg border border-emerald-300/20 bg-emerald-500/10 text-emerald-300 transition hover:border-emerald-300/35 hover:bg-emerald-500/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Activate ${category.name}`}
                          >
                            {deletingId === category.id ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <Power size={12} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/25">
                          Subcategories
                        </span>
                        <span className="grid min-w-6 place-items-center rounded-full bg-[#fff1f2] px-1.5 py-1 text-[8px] font-bold text-[#d71920]">
                          {category.children.length}
                        </span>
                      </div>
                    </div>

                    {category.children.length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {category.children.map((child) => (
                          <div
                            key={child.id}
                            className="group/child flex min-w-0 items-center gap-2.5 rounded-xl border border-black/7 bg-[#fafafa] px-3 py-2.5 transition hover:border-[#d71920]/16 hover:bg-[#fffafa]"
                          >
                            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white text-[#d71920] shadow-[0_2px_8px_rgba(0,0,0,0.05)] ring-1 ring-black/4">
                              <ChevronRight size={12} strokeWidth={2.4} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[10px] font-semibold text-black/63 group-hover/child:text-[#d71920]">
                                {child.name}
                              </p>
                              <p className="mt-0.5 truncate text-[7px] text-black/23">
                                /{child.slug}
                              </p>
                            </div>
                            <span
                              className={`mr-1 rounded-full px-1.5 py-1 text-[6px] font-bold uppercase tracking-[0.08em] ${
                                child.isActive
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-black/[0.05] text-black/30"
                              }`}
                            >
                              {child.isActive ? "Active" : "Inactive"}
                            </span>
                            <div className="ml-auto flex shrink-0 items-center gap-1 opacity-70 transition group-hover/child:opacity-100">
                              {child.isActive ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditSubcategory(child, category.id)
                                    }
                                    className="grid size-7 place-items-center rounded-lg text-black/30 transition hover:bg-white hover:text-[#d71920]"
                                    aria-label={`Edit ${child.name}`}
                                  >
                                    <Pencil size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      requestDelete(
                                        child.id,
                                        `subcategory “${child.name}”`,
                                        false,
                                      )
                                    }
                                    disabled={deletingId === child.id}
                                    className="grid size-7 place-items-center rounded-lg text-black/25 transition hover:bg-[#fff0f1] hover:text-[#d71920] disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label={`Deactivate ${child.name}`}
                                  >
                                    {deletingId === child.id ? (
                                      <RefreshCw size={11} className="animate-spin" />
                                    ) : (
                                      <Trash2 size={11} />
                                    )}
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void activateCategory(
                                      child.id,
                                      `Subcategory “${child.name}”`,
                                    )
                                  }
                                  disabled={deletingId === child.id}
                                  className="grid size-7 place-items-center rounded-lg text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  aria-label={`Activate ${child.name}`}
                                >
                                  {deletingId === child.id ? (
                                    <RefreshCw size={11} className="animate-spin" />
                                  ) : (
                                    <Power size={11} />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl border border-dashed border-black/9 bg-[#fafafa] px-3 py-3 text-[8px] text-black/27">
                        <Folder size={12} />
                        No subcategories yet.
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        {/* DEACTIVATE CONFIRMATION MODAL */}
        {deleteConfirmation ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-[480px] overflow-hidden rounded-[22px] bg-white shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
              <div className="relative bg-[#111111] px-5 py-5 sm:px-6">
                <div className="absolute inset-x-0 top-0 h-[3px] bg-[#d71920]" />
                <div className="flex items-start justify-between gap-4 pt-1">
                  <div>
                    <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-[0.16em]">
                      <span className="text-[#ff5a61]">Catalog</span>
                      <span className="text-white/15">•</span>
                      <span className="text-white/30">Soft delete</span>
                    </div>
                    <h2 className="mt-1.5 text-[19px] font-semibold tracking-[-0.025em] text-white">
                      Deactivate {deleteConfirmation.isMain ? "main category" : "subcategory"}?
                    </h2>
                    <p className="mt-1 text-[9px] leading-4 text-white/40">
                      This will deactivate the record. It will be hidden from Active but remain available in Inactive and All.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeDeleteConfirmation}
                    disabled={deletingId !== null}
                    className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#d71920] text-white shadow-[0_8px_18px_rgba(215,25,32,0.24)] transition hover:bg-[#bc151b] disabled:opacity-50"
                    aria-label="Close deactivate dialog"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-5 sm:p-6">
                <div className="rounded-xl border border-[#d71920]/12 bg-[#fff7f7] px-4 py-3">
                  <p className="text-[10px] font-semibold text-black/72">
                    {deleteConfirmation.label}
                  </p>
                </div>

                {deleteConfirmation.children.length > 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-[10px] font-bold text-amber-800">
                      This category contains {deleteConfirmation.children.length} subcategor{deleteConfirmation.children.length === 1 ? "y" : "ies"}.
                    </p>
                    <p className="mt-1 text-[8px] leading-4 text-amber-700/80">
                      Do you want to deactivate this main category together with these subcategories?
                    </p>
                    <div className="mt-3 space-y-1.5">
                      {deleteConfirmation.children.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center gap-2 rounded-lg border border-amber-200/70 bg-white/70 px-2.5 py-2"
                        >
                          <ChevronRight size={11} className="text-[#d71920]" />
                          <span className="min-w-0 flex-1 truncate text-[9px] font-medium text-black/58">
                            {child.name}
                          </span>
                          <span className="text-[7px] font-bold uppercase tracking-[0.08em] text-black/25">
                            {child.isActive ? "Active" : "Already inactive"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[9px] leading-5 text-black/42">
                    The item will disappear from the Active filter after deactivation.
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 border-t border-black/7 pt-4">
                  <button
                    type="button"
                    onClick={closeDeleteConfirmation}
                    disabled={deletingId !== null}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-black/9 bg-white px-4 text-[10px] font-semibold text-black/50 transition hover:bg-[#fafafa] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmDelete()}
                    disabled={deletingId !== null}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#d71920] px-4 text-[10px] font-bold text-white shadow-[0_8px_18px_rgba(215,25,32,0.20)] transition hover:bg-[#bd151c] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId !== null ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                    {deletingId !== null
                      ? "Deactivating..."
                      : deleteConfirmation.children.length > 0
                        ? "Deactivate with subcategories"
                        : "Deactivate"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* EDIT CATEGORY MODAL */}
        {editing ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-[500px] overflow-hidden rounded-[22px] bg-white shadow-[0_28px_80px_rgba(0,0,0,0.25)]">
              <div className="relative bg-[#111111] px-5 py-5 sm:px-6">
                <div className="absolute inset-x-0 top-0 h-[3px] bg-[#d71920]" />
                <div className="flex items-start justify-between gap-4 pt-1">
                  <div>
                    <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-[0.16em]">
                      <span className="text-[#ff5a61]">Catalog</span>
                      <span className="text-white/15">•</span>
                      <span className="text-white/30">Edit category</span>
                    </div>
                    <h2 className="mt-1.5 text-[19px] font-semibold tracking-[-0.025em] text-white">
                      Edit {editing.parentId ? "subcategory" : "category"}
                    </h2>
                    <p className="mt-1 text-[9px] leading-4 text-white/40">
                      Update the name or parent category and save the change.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#d71920] text-white shadow-[0_8px_18px_rgba(215,25,32,0.24)] transition hover:bg-[#bc151b]"
                    aria-label="Close edit dialog"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-5 p-5 sm:p-6">
                <Field label="Category name" required>
                  <div className="relative">
                    <Tag
                      size={14}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#d71920]/55"
                    />
                    <input
                      autoFocus
                      value={editing.name}
                      onChange={(event) =>
                        setEditing((current) =>
                          current
                            ? { ...current, name: event.target.value }
                            : current,
                        )
                      }
                      maxLength={120}
                      required
                      className="h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] pl-10 pr-3 text-[11px] text-black outline-none transition focus:border-[#d71920]/45 focus:bg-white focus:ring-4 focus:ring-[#d71920]/9"
                    />
                  </div>
                </Field>

                {editing.isMain ? (
                  <Field label="Parent category">
                    <div className="flex h-12 items-center justify-between rounded-xl border border-black/8 bg-[#f7f7f5] px-3">
                      <span className="text-[11px] font-medium text-black/55">
                        None — Main category
                      </span>
                      <span className="rounded-full bg-[#111111] px-2 py-1 text-[7px] font-bold uppercase tracking-[0.1em] text-white/75">
                        Main
                      </span>
                    </div>
                    <p className="mt-1.5 text-[8px] text-black/28">
                      Main categories stay at the top level.
                    </p>
                  </Field>
                ) : (
                  <Field label="Parent category">
                    <select
                      value={editing.parentId}
                      onChange={(event) =>
                        setEditing((current) =>
                          current
                            ? {
                                ...current,
                                parentId: event.target.value,
                              }
                            : current,
                        )
                      }
                      className="h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-[11px] text-black outline-none transition focus:border-[#d71920]/45 focus:bg-white focus:ring-4 focus:ring-[#d71920]/9"
                    >
                      <option value="">None — Main category</option>
                      {categories
                        .filter((category) => category.isActive)
                        .map((category) => (
                          <option key={category.id} value={String(category.id)}>
                            {category.name}
                          </option>
                        ))}
                    </select>
                    <p className="mt-1.5 text-[8px] text-black/28">
                      Select another main category to move this subcategory, or choose None to promote it.
                    </p>
                  </Field>
                )}

                <div className="flex items-center justify-end gap-2 border-t border-black/7 pt-4">
                  <button
                    type="button"
                    onClick={closeEdit}
                    disabled={editSaving}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-black/9 bg-white px-4 text-[10px] font-semibold text-black/50 transition hover:bg-[#fafafa] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving || !editing.name.trim()}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#d71920] px-4 text-[10px] font-bold text-white shadow-[0_8px_18px_rgba(215,25,32,0.20)] transition hover:bg-[#c4161d] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {editSaving ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Save size={12} />
                    )}
                    {editSaving ? "Saving..." : "Save changes"}
                  </button>
                </div>

                {(error || message) ? (
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[9px] ${
                      error
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {error ? <AlertCircle size={13} /> : <Check size={13} />}
                    <span>{error || message}</span>
                  </div>
                ) : null}
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-black/40">
        {label}
        {required ? <span style={{ color: RED }}>*</span> : null}
      </label>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Layers3;
  tone: "neutral" | "red" | "dark";
}) {
  const toneClasses =
    tone === "red"
      ? "border-[#d71920]/15 bg-[#fff7f7]"
      : tone === "dark"
        ? "border-[#111111] bg-[#111111]"
        : "border-black/8 bg-white";

  const iconClasses =
    tone === "red"
      ? "bg-[#fde5e6] text-[#d71920]"
      : tone === "dark"
        ? "bg-white/[0.08] text-white/70"
        : "bg-black/[0.045] text-black/35";

  const valueClasses =
    tone === "red"
      ? "text-[#d71920]"
      : tone === "dark"
        ? "text-white"
        : "text-black/75";

  const textClasses =
    tone === "dark" ? "text-white/32" : "text-black/30";

  return (
    <div
      className={`min-h-[78px] rounded-2xl border p-4 shadow-[0_8px_22px_rgba(0,0,0,0.035)] ${toneClasses}`}
    >
      <div className="flex items-center justify-between">
        <span className={`grid size-8 place-items-center rounded-lg ${iconClasses}`}>
          <Icon size={15} strokeWidth={2} />
        </span>
        <span
          className={`text-[7px] font-bold uppercase tracking-[0.16em] ${
            tone === "dark" ? "text-white/24" : "text-black/20"
          }`}
        >
          Catalog
        </span>
      </div>
      <div className="mt-3">
        <div className={`text-[21px] font-semibold tracking-[-0.04em] ${valueClasses}`}>
          {value}
        </div>
        <div className={`mt-0.5 text-[9px] ${textClasses}`}>{label}</div>
      </div>
    </div>
  );
}
