"use client";

import Image from "next/image";

import Link from "next/link";

import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Ban,
  Check,
  Image as ImageIcon,
  Power,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

import type { ChangeEvent, FormEvent } from "react";

type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type ProductImage = {
  id: number;
  imageUrl: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

type Product = {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  price: string | number | null;
  compareAtPrice: string | number | null;
  shortDescription: string | null;
  description: string | null;
  status: ProductStatus;
  isAvailable: boolean;
  isFeatured: boolean;
  category: {
    id: number;
    name: string;
  } | null;
  images: ProductImage[];
};

type CategoryChild = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  children?: CategoryChild[];
};

type ProductForm = {
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  shortDescription: string;
  description: string;
  status: ProductStatus;
  isAvailable: boolean;
  isFeatured: boolean;
};

const inputClass =
  "w-full rounded-xl border border-black/8 bg-white px-3 py-2.5 text-sm text-black/78 outline-none transition placeholder:text-black/25 focus:border-[#d71920]/40 focus:ring-2 focus:ring-[#d71920]/8";

const EMPTY_FORM: ProductForm = {
  name: "",
  sku: "",
  price: "",
  compareAtPrice: "",
  shortDescription: "",
  description: "",
  status: "DRAFT",
  isAvailable: true,
  isFeatured: false,
};

function resolveImageUrl(value: string | null | undefined) {
  if (!value) return "";

  let url = value.trim().replace(/\\/g, "/");

  if (!url) return "";

  if (
    /^https?:\/\//i.test(url) ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  url = url.replace(/^\.\//, "");
  url = url.replace(/^public\//i, "");
  url = url.replace(/^\/public\//i, "/");

  const publicIndex = url.toLowerCase().indexOf("/public/");

  if (publicIndex >= 0) {
    url = url.slice(publicIndex + "/public/".length);
  }

  if (!url.startsWith("/")) {
    url = `/${url}`;
  }

  return url;
}

async function readJsonResponse(
  response: Response,
): Promise<Record<string, unknown>> {
  const text = await response.text();

  if (!text.trim()) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(text);

    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }

    return {};
  } catch {
    throw new Error(
      `Server returned an unexpected response (${response.status} ${response.statusText}).`,
    );
  }
}

function getResponseMessage(
  data: Record<string, unknown>,
  fallback: string,
): string {
  const message = data.message ?? data.error;

  return typeof message === "string"
    ? message
    : fallback;
}

function formatPrice(value: string | number | null) {
  if (value === null || value === "") {
    return "Contact for Price";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Contact for Price";
  }

  return `LKR ${amount.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ProductEditClient({
  productId,
}: {
  productId: number;
}) {
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [selectedMainCategory, setSelectedMainCategory] =
    useState("");
  const [selectedSubcategory, setSelectedSubcategory] =
    useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageBusyId, setImageBusyId] =
    useState<number | null>(null);
  const [uploadingMore, setUploadingMore] =
    useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const mainCategory = useMemo(
    () =>
      categories.find(
        (category) =>
          String(category.id) === selectedMainCategory,
      ) ?? null,
    [categories, selectedMainCategory],
  );

  async function loadProduct() {
    setLoading(true);
    setError("");

    try {
      const [
        productsResponse,
        categoriesResponse,
      ] = await Promise.all([
        fetch("/api/admin/products", {
          cache: "no-store",
        }),
        fetch("/api/admin/categories", {
          cache: "no-store",
        }),
      ]);

      if (
        productsResponse.status === 401 ||
        categoriesResponse.status === 401
      ) {
        router.push("/admin/login");
        return;
      }

      const productsData =
        await productsResponse.json();

      const categoriesData =
        await categoriesResponse.json();

      if (!productsResponse.ok) {
        throw new Error(
          getResponseMessage(
            productsData,
            "Failed to load product information.",
          ),
        );
      }

      if (!categoriesResponse.ok) {
        throw new Error(
          getResponseMessage(
            categoriesData,
            "Failed to load categories.",
          ),
        );
      }

      const foundProduct = (
        Array.isArray(productsData.products)
          ? productsData.products
          : []
      ).find(
        (item: Product) =>
          item.id === productId,
      ) as Product | undefined;

      if (!foundProduct) {
        throw new Error("Product not found.");
      }

      const loadedCategories =
        Array.isArray(categoriesData.categories)
          ? categoriesData.categories
          : [];

      setCategories(loadedCategories);
      setProduct(foundProduct);

      setForm({
        name: foundProduct.name,
        sku: foundProduct.sku ?? "",
        price:
          foundProduct.price == null
            ? ""
            : String(foundProduct.price),
        compareAtPrice:
          foundProduct.compareAtPrice == null
            ? ""
            : String(foundProduct.compareAtPrice),
        shortDescription:
          foundProduct.shortDescription ?? "",
        description:
          foundProduct.description ?? "",
        status: foundProduct.status,
        isAvailable: foundProduct.isAvailable,
        isFeatured: foundProduct.isFeatured,
      });

      const categoryId =
        foundProduct.category?.id;

      if (categoryId) {
        const directMain =
          loadedCategories.find(
            (category: Category) =>
              category.id === categoryId,
          );

        if (directMain) {
          setSelectedMainCategory(
            String(directMain.id),
          );

          setSelectedSubcategory("");
        } else {
          const parent =
            loadedCategories.find(
              (category: Category) =>
                category.children?.some(
                  (child) =>
                    child.id === categoryId,
                ),
            );

          if (parent) {
            setSelectedMainCategory(
              String(parent.id),
            );

            setSelectedSubcategory(
              String(categoryId),
            );
          }
        }
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load product.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProduct();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };

    // productId is the only value that needs
    // to trigger the initial load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  function updateField<K extends keyof ProductForm>(
    field: K,
    value: ProductForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!product || saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const price = Number(form.price);

      if (!form.name.trim()) {
        throw new Error(
          "Product name is required.",
        );
      }

      if (
        !form.price.trim() ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        throw new Error(
          "Please enter a valid selling price.",
        );
      }

      const compareAtPrice =
        form.compareAtPrice.trim()
          ? Number(form.compareAtPrice)
          : null;

      if (
        compareAtPrice !== null &&
        (!Number.isFinite(
          compareAtPrice,
        ) ||
          compareAtPrice < 0)
      ) {
        throw new Error(
          "Please enter a valid compare-at price.",
        );
      }

      const categoryId =
        selectedSubcategory
          ? Number(selectedSubcategory)
          : selectedMainCategory
            ? Number(
                selectedMainCategory,
              )
            : null;

      const response = await fetch(
        `/api/admin/products/${product.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            sku:
              form.sku.trim() || null,
            price,
            compareAtPrice,
            shortDescription:
              form.shortDescription.trim() ||
              null,
            description:
              form.description.trim() ||
              null,
            status: form.status,
            isAvailable:
              form.isAvailable,
            isFeatured:
              form.isFeatured,
            categoryId,
          }),
        },
      );

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data =
        await readJsonResponse(response);

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          getResponseMessage(
            data,
            "Failed to update product.",
          ),
        );
      }

      setSuccess(
        "Product updated successfully.",
      );

      await loadProduct();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update product.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadImages(
    files: File[],
    checkCapacity = true,
  ) {
    if (!product || files.length === 0) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    const invalidFile = files.find(
      (file) =>
        !allowedTypes.includes(
          file.type,
        ),
    );

    if (invalidFile) {
      throw new Error(
        `${invalidFile.name} is not supported. Use JPG, PNG or WebP.`,
      );
    }

    const oversizedFile = files.find(
      (file) =>
        file.size > 5 * 1024 * 1024,
    );

    if (oversizedFile) {
      throw new Error(
        `${oversizedFile.name} is larger than 5 MB.`,
      );
    }

    if (checkCapacity) {
      const remainingSlots =
        Math.max(
          0,
          5 - product.images.length,
        );

      if (
        files.length >
        remainingSlots
      ) {
        throw new Error(
          `This product already has ${product.images.length} image(s). You can add only ${remainingSlots} more.`,
        );
      }
    }

    const formData = new FormData();

    files.forEach((file) =>
      formData.append(
        "images",
        file,
      ),
    );

    const response = await fetch(
      `/api/admin/products/${product.id}/images`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (response.status === 401) {
      router.push("/admin/login");
      return;
    }

    const data =
      await readJsonResponse(response);

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        getResponseMessage(
          data,
          "Failed to upload product images.",
        ),
      );
    }
  }

  async function handleAddMore(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files =
      event.target.files;

    event.currentTarget.value = "";

    if (
      !product ||
      !files ||
      files.length === 0 ||
      uploadingMore
    ) {
      return;
    }

    setUploadingMore(true);
    setError("");
    setSuccess("");

    try {
      await uploadImages(
        Array.from(files),
      );

      setSuccess(
        "Product images added successfully.",
      );

      await loadProduct();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to add product images.",
      );
    } finally {
      setUploadingMore(false);
    }
  }

  async function handleRemoveImage(
    image: ProductImage,
  ) {
    if (
      !product ||
      imageBusyId !== null
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Remove this image from "${product.name}"?`,
      );

    if (!confirmed) {
      return;
    }

    setImageBusyId(image.id);
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          `/api/admin/product-images/${image.id}`,
          {
            method: "DELETE",
          },
        );

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data =
        await readJsonResponse(
          response,
        );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          getResponseMessage(
            data,
            "Failed to remove image.",
          ),
        );
      }

      setSuccess(
        "Image removed successfully.",
      );

      await loadProduct();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Failed to remove image.",
      );
    } finally {
      setImageBusyId(null);
    }
  }

  async function handleReplaceImage(
    image: ProductImage,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    event.currentTarget.value = "";

    if (
      !product ||
      !file ||
      imageBusyId !== null
    ) {
      return;
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      setError(
        "Use JPG, PNG or WebP images.",
      );

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "The replacement image must be 5 MB or smaller.",
      );

      return;
    }

    setImageBusyId(image.id);
    setError("");
    setSuccess("");

    try {
      // Upload the replacement first.
      // This prevents accidental data loss
      // when an upload fails.
      await uploadImages(
        [file],
        false,
      );

      const response =
        await fetch(
          `/api/admin/product-images/${image.id}`,
          {
            method: "DELETE",
          },
        );

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data =
        await readJsonResponse(
          response,
        );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          getResponseMessage(
            data,
            "Replacement was uploaded, but the old image could not be removed.",
          ),
        );
      }

      setSuccess(
        "Image replaced successfully.",
      );

      await loadProduct();
    } catch (replaceError) {
      setError(
        replaceError instanceof Error
          ? replaceError.message
          : "Failed to replace image.",
      );

      await loadProduct();
    } finally {
      setImageBusyId(null);
    }
  }

  async function handleToggleAvailability() {
    if (!product || actionBusy) {
      return;
    }

    const nextAvailable =
      !product.isAvailable;

    if (!nextAvailable) {
      const confirmed =
        window.confirm(
          `Deactivate "${product.name}"?\n\nCustomers will no longer be able to purchase this product.`,
        );

      if (!confirmed) {
        return;
      }
    }

    setActionBusy(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          `/api/admin/products/${product.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              name: product.name,
              sku: product.sku,
              price:
                product.price == null
                  ? null
                  : Number(
                      product.price,
                    ),
              compareAtPrice:
                product.compareAtPrice ==
                null
                  ? null
                  : Number(
                      product.compareAtPrice,
                    ),
              shortDescription:
                product.shortDescription,
              description:
                product.description,
              status:
                product.status,
              isAvailable:
                nextAvailable,
              isFeatured:
                product.isFeatured,
              categoryId:
                product.category
                  ?.id ?? null,
            }),
          },
        );

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data =
        await readJsonResponse(
          response,
        );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          getResponseMessage(
            data,
            "Failed to update availability.",
          ),
        );
      }

      setSuccess(
        nextAvailable
          ? "Product activated successfully."
          : "Product deactivated successfully.",
      );

      await loadProduct();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Failed to update product availability.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-black/7 bg-white px-5 py-16 text-center text-sm text-black/40">
        Loading product...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-10 text-center text-sm text-red-700">
        {error || "Product not found."}
      </div>
    );
  }

  const remainingSlots =
    5 - product.images.length;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-5">
      <div className="flex flex-col gap-4 border-b border-black/7 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin/products"
            className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold text-black/40 transition hover:text-[#d71920]"
          >
            <ArrowLeft size={14} />
            Back to Products
          </Link>

          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-green)]">
            Product Details
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-black sm:text-3xl">
            {product.name}
          </h1>

          <p className="mt-1 text-[11px] text-black/36">
            Edit product information
            and manage its uploaded
            images.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void handleToggleAvailability()
          }
          disabled={actionBusy}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
            product.isAvailable
              ? "border-red-200 bg-white text-red-600 hover:bg-red-50"
              : "border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50"
          }`}
        >
          {actionBusy ? (
            <RefreshCw
              size={14}
              className="animate-spin"
            />
          ) : product.isAvailable ? (
            <Ban size={14} />
          ) : (
            <Power size={14} />
          )}

          {actionBusy
            ? "Saving..."
            : product.isAvailable
              ? "Deactivate"
              : "Activate"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] text-emerald-700">
          {success}
        </div>
      ) : null}

      <form
        onSubmit={handleSave}
        className="space-y-5"
      >
        <section className="rounded-2xl border border-black/7 bg-white p-5 shadow-[0_12px_38px_rgba(0,0,0,0.035)] sm:p-6">
          <div className="mb-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/32">
              Product information
            </p>

            <p className="mt-1 text-[11px] text-black/34">
              Update the product
              details shown in your
              catalog and storefront.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/36">
                Product name
              </span>

              <input
                className={inputClass}
                value={form.name}
                onChange={(event) =>
                  updateField(
                    "name",
                    event.target.value,
                  )
                }
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/36">
                SKU
              </span>

              <input
                className={inputClass}
                value={form.sku}
                onChange={(event) =>
                  updateField(
                    "sku",
                    event.target.value,
                  )
                }
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/36">
                Main category
              </span>

              <select
                className={inputClass}
                value={
                  selectedMainCategory
                }
                onChange={(event) => {
                  setSelectedMainCategory(
                    event.target.value,
                  );

                  setSelectedSubcategory(
                    "",
                  );
                }}
              >
                <option value="">
                  Select a main category
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={category.id}
                      value={String(
                        category.id,
                      )}
                    >
                      {category.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/36">
                Subcategory
              </span>

              <select
                className={inputClass}
                value={
                  selectedSubcategory
                }
                disabled={
                  !selectedMainCategory ||
                  !mainCategory
                    ?.children?.length
                }
                onChange={(event) =>
                  setSelectedSubcategory(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  {!selectedMainCategory
                    ? "Select a main category first"
                    : mainCategory?.children
                        ?.length
                      ? "Select a subcategory"
                      : "No subcategories"}
                </option>

                {mainCategory?.children?.map(
                  (child) => (
                    <option
                      key={child.id}
                      value={String(
                        child.id,
                      )}
                    >
                      {child.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/36">
                Selling price (LKR)
              </span>

              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) =>
                  updateField(
                    "price",
                    event.target.value,
                  )
                }
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/36">
                Compare-at price (LKR)
              </span>

              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={
                  form.compareAtPrice
                }
                onChange={(event) =>
                  updateField(
                    "compareAtPrice",
                    event.target.value,
                  )
                }
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/36">
                Status
              </span>

              <select
                className={inputClass}
                value={form.status}
                onChange={(event) =>
                  updateField(
                    "status",
                    event.target
                      .value as ProductStatus,
                  )
                }
              >
                <option value="DRAFT">
                  Draft
                </option>

                <option value="PUBLISHED">
                  Published
                </option>

                <option value="ARCHIVED">
                  Archived
                </option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  updateField(
                    "isAvailable",
                    !form.isAvailable,
                  )
                }
                aria-pressed={
                  form.isAvailable
                }
                className={`flex h-12 items-center justify-between rounded-xl border px-3 text-left transition ${
                  form.isAvailable
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-black/8 bg-white"
                }`}
              >
                <span>
                  <span className="block text-[10px] font-semibold text-black/65">
                    Available
                  </span>

                  <span className="mt-0.5 block text-[9px] text-black/35">
                    {form.isAvailable
                      ? "Customers can buy"
                      : "Off"}
                  </span>
                </span>

                <span
                  className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                    form.isAvailable
                      ? "bg-emerald-500"
                      : "bg-black/12"
                  }`}
                >
                  <span
                    className={`absolute top-1 size-3 rounded-full bg-white shadow-sm transition ${
                      form.isAvailable
                        ? "left-5"
                        : "left-1"
                    }`}
                  />
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  updateField(
                    "isFeatured",
                    !form.isFeatured,
                  )
                }
                aria-pressed={
                  form.isFeatured
                }
                className={`flex h-12 items-center justify-between rounded-xl border px-3 text-left transition ${
                  form.isFeatured
                    ? "border-amber-200 bg-amber-50"
                    : "border-black/8 bg-white"
                }`}
              >
                <span>
                  <span className="block text-[10px] font-semibold text-black/65">
                    Featured
                  </span>

                  <span className="mt-0.5 block text-[9px] text-black/35">
                    {form.isFeatured
                      ? "Shown as featured"
                      : "Off"}
                  </span>
                </span>

                <span
                  className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                    form.isFeatured
                      ? "bg-amber-500"
                      : "bg-black/12"
                  }`}
                >
                  <span
                    className={`absolute top-1 size-3 rounded-full bg-white shadow-sm transition ${
                      form.isFeatured
                        ? "left-5"
                        : "left-1"
                    }`}
                  />
                </span>
              </button>
            </div>

            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/36">
                Short description
              </span>

              <input
                className={inputClass}
                value={
                  form.shortDescription
                }
                onChange={(event) =>
                  updateField(
                    "shortDescription",
                    event.target.value,
                  )
                }
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/36">
                Description
              </span>

              <textarea
                className={`${inputClass} min-h-32 resize-y`}
                value={
                  form.description
                }
                onChange={(event) =>
                  updateField(
                    "description",
                    event.target.value,
                  )
                }
              />
            </label>
          </div>

          <div className="mt-5 flex justify-end border-t border-black/7 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#d71920] px-5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#c5151c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <Check size={14} />
              )}

              {saving
                ? "Saving..."
                : "Save changes"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-black/7 bg-white p-5 shadow-[0_12px_38px_rgba(0,0,0,0.035)] sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/32">
                Uploaded images
              </p>

              <p className="mt-1 text-[11px] text-black/34">
                Replace, remove or add
                product images.
                Maximum 5 images per
                product.
              </p>
            </div>

            <label
              className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-black/8 px-3.5 text-[10px] font-semibold text-black/55 transition hover:border-black/15 hover:text-black ${
                remainingSlots <= 0 ||
                uploadingMore
                  ? "pointer-events-none opacity-45"
                  : ""
              }`}
              title={
                remainingSlots > 0
                  ? `Add up to ${remainingSlots} more image${
                      remainingSlots ===
                      1
                        ? ""
                        : "s"
                    }`
                  : "Maximum 5 images reached"
              }
            >
              {uploadingMore ? (
                <RefreshCw
                  size={13}
                  className="animate-spin"
                />
              ) : (
                <Upload size={13} />
              )}

              {uploadingMore
                ? "Uploading..."
                : "Add more"}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={
                  remainingSlots <=
                    0 ||
                  uploadingMore
                }
                className="hidden"
                onChange={(event) =>
                  void handleAddMore(
                    event,
                  )
                }
              />
            </label>
          </div>

          {product.images.length >
          0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {product.images.map(
                (image) => {
                  const imageUrl =
                    resolveImageUrl(
                      image.imageUrl,
                    );

                  const busy =
                    imageBusyId ===
                    image.id;

                  return (
                    <div
                      key={image.id}
                      className="overflow-hidden rounded-xl border border-black/7 bg-[#fafafa]"
                    >
                      <div className="relative aspect-square bg-[#f1f1ee]">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={
                              image.altText ||
                              product.name
                            }
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="grid h-full place-items-center text-black/20">
                            <ImageIcon
                              size={22}
                            />
                          </div>
                        )}

                        {image.isPrimary ? (
                          <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-white">
                            Primary
                          </span>
                        ) : null}

                        {busy ? (
                          <div className="absolute inset-0 grid place-items-center bg-black/25 text-white">
                            <RefreshCw
                              size={20}
                              className="animate-spin"
                            />
                          </div>
                        ) : null}
                      </div>

                      <div className="flex gap-2 border-t border-black/6 p-2">
                        <label className="inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-black/8 bg-white text-[9px] font-semibold text-black/48 transition hover:border-black/15 hover:text-black">
                          <Upload
                            size={11}
                          />

                          Replace

                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            disabled={busy}
                            onChange={(event) =>
                              void handleReplaceImage(
                                image,
                                event,
                              )
                            }
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() =>
                            void handleRemoveImage(
                              image,
                            )
                          }
                          disabled={busy}
                          className="grid size-8 shrink-0 place-items-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                          title="Remove image"
                          aria-label="Remove image"
                        >
                          <Trash2
                            size={12}
                          />
                        </button>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-black/10 bg-[#fafafa] px-5 py-10 text-center">
              <ImageIcon
                size={22}
                className="mx-auto text-black/20"
              />

              <p className="mt-2 text-[11px] font-semibold text-black/50">
                No product images
                uploaded.
              </p>

              <p className="mt-1 text-[10px] text-black/30">
                Use Add more above to
                upload product
                images.
              </p>
            </div>
          )}
        </section>
      </form>

      <div className="flex flex-wrap items-center gap-2 px-1 text-[9px] text-black/28">
        <Link
          href={`/product/${product.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 font-semibold text-black/40 hover:text-[#d71920]"
        >
          View storefront product

          <span aria-hidden>
            ↗
          </span>
        </Link>

        <span>•</span>

        <span>
          {formatPrice(product.price)}
        </span>

        <span>•</span>

        <span>
          {product.images.length}/5
          images
        </span>
      </div>
    </div>
  );
}