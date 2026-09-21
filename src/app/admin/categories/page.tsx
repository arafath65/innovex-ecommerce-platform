
"use client";

import { useCallback, useEffect, useState } from "react";

type Subcategory = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  children: Subcategory[];
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/categories");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load categories");
      }

      setCategories(data.categories ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create category");
      }

      setName("");
      setParentId("");

      setMessage(
        parentId
          ? "Subcategory created successfully."
          : "Category created successfully."
      );

      await loadCategories();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">
            Categories
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage product categories and subcategories.
          </p>
        </header>

        {/* Add Category Form */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Add Category
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Leave Parent Category as None to create a main
            category. Select a parent to create a subcategory.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div>
              <label
                htmlFor="categoryName"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Category / Subcategory Name
              </label>

              <input
                id="categoryName"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Kitchenware or Cookware"
                maxLength={120}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="parentCategory"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Parent Category
              </label>

              <select
                id="parentCategory"
                value={parentId}
                onChange={(event) => setParentId(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">None — Main Category</option>

                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              {error && (
                <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {message && (
                <div className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : parentId
                    ? "Create Subcategory"
                    : "Create Category"}
              </button>
            </div>
          </form>
        </section>

        {/* Existing Categories */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-gray-900">
                Existing Categories
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {categories.length} main categor
                {categories.length === 1 ? "y" : "ies"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadCategories()}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="p-5 text-sm text-gray-500">
              Loading categories...
            </p>
          ) : error && categories.length === 0 ? (
            <p className="p-5 text-sm text-red-600">{error}</p>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-medium text-gray-700">
                No categories yet
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Use the form above to create your first category.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {categories.map((category) => (
                <div key={category.id} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {category.name}
                      </h3>

                      <p className="text-xs text-gray-400">
                        /{category.slug}
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      Main Category
                    </span>
                  </div>

                  {category.children.length > 0 ? (
                    <div className="mt-3 space-y-2 border-l-2 border-gray-200 pl-4">
                      {category.children.map((child) => (
                        <div
                          key={child.id}
                          className="flex flex-wrap items-center justify-between gap-2"
                        >
                          <div>
                            <p className="text-sm text-gray-800">
                              ↳ {child.name}
                            </p>

                            <p className="text-xs text-gray-400">
                              /{child.slug}
                            </p>
                          </div>

                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                            Subcategory
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-gray-400">
                      No subcategories
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}