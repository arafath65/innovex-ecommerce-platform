
"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";

type Product = {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  price: string | number;
  compareAtPrice: string | number | null;
  shortDescription: string | null;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isAvailable: boolean;
  isFeatured: boolean;
  category?: {
    id: number;
    name: string;
  } | null;
  images?: {
    id: number;
    imageUrl: string;
    altText: string | null;
    isPrimary: boolean;
    sortOrder: number;
  }[];
};

type Category = {
  id: number;
  name: string;
  slug: string;
  children: {
    id: number;
    name: string;
    slug: string;
    parentId: number | null;
  }[];
};

type ProductForm = {
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  shortDescription: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isAvailable: boolean;
  isFeatured: boolean;
};

const initialForm: ProductForm = {
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

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100";

const labelClass =
  "mb-1.5 block text-sm font-medium text-gray-700";

function formatPrice(value: string | number | null) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function statusStyle(status: Product["status"]) {
  if (status === "PUBLISHED") {
    return "bg-green-100 text-green-700";
  }

  if (status === "ARCHIVED") {
    return "bg-gray-200 text-gray-700";
  }

  return "bg-amber-100 text-amber-700";
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");

const [selectedImages, setSelectedImages] = useState<File[]>([]);

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingProductId, setUploadingProductId] =
    useState<number | null>(null);

  // Create and clean up image preview URLs.
  useEffect(() => {
    const urls = selectedImages.map((file) =>
      URL.createObjectURL(file)
    );

    setImagePreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedImages]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/products", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load products.");
      }

      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading products."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/categories", {
        cache: "no-store",
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || "Failed to load categories");
      }
  
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load categories"
      );
    }
  }, []);
  
  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  function updateField<K extends keyof ProductForm>(
    field: K,
    value: ProductForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setSelectedMainCategory("");
    setSelectedSubcategory("");
    setSelectedImages([]);
  }

  
function removeSelectedImage(indexToRemove: number) {
  setSelectedImages((current) =>
    current.filter((_, index) => index !== indexToRemove)
  );
}

  
function handleImageSelection(files: FileList | null) {
  if (!files || files.length === 0) return;

  const chosenFiles = Array.from(files);
  const combinedFiles = [...selectedImages, ...chosenFiles];

  if (combinedFiles.length > 5) {
    setError(
      `You already selected ${selectedImages.length} image(s). You can select only ${5 - selectedImages.length} more.`
    );
    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  const invalidFile = chosenFiles.find(
    (file) => !allowedTypes.includes(file.type)
  );

  if (invalidFile) {
    setError(
      `${invalidFile.name} is not supported. Use JPEG, PNG, or WebP.`
    );
    return;
  }

  const oversizedFile = chosenFiles.find(
    (file) => file.size > 5 * 1024 * 1024
  );

  if (oversizedFile) {
    setError(
      `${oversizedFile.name} exceeds the 5MB file size limit.`
    );
    return;
  }

  setError("");
  setSelectedImages(combinedFiles);
}

  async function uploadImages(
    productId: number,
    files: File[]
  ) {
    if (files.length === 0) return;

    setUploadingProductId(productId);

    try {
      const formData = new FormData();

      files.forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetch(
        `/api/admin/products/${productId}/images`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to upload product images."
        );
      }
    } finally {
      setUploadingProductId(null);
    }
  }

  async function handleImageUpload(
    productId: number,
    files: FileList | null
  ) {
    if (!files || files.length === 0) return;

    const chosenFiles = Array.from(files);

    if (chosenFiles.length > 5) {
      setError("You can upload a maximum of 5 images at a time.");
      return;
    }

    setMessage("");
    setError("");
    setUploadingProductId(productId);

    try {
      const formData = new FormData();

      chosenFiles.forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetch(
        `/api/admin/products/${productId}/images`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to upload images."
        );
      }

      setMessage("Product images uploaded successfully.");

      await loadProducts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while uploading images."
      );
    } finally {
      setUploadingProductId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!form.name.trim()) {
      setError("Please enter a product name.");
      return;
    }

    const price = Number(form.price);

    if (!form.price.trim() || !Number.isFinite(price) || price < 0) {
      setError("Please enter a valid product price.");
      return;
    }

    let compareAtPrice: number | null = null;

    if (form.compareAtPrice.trim()) {
      compareAtPrice = Number(form.compareAtPrice);

      if (!Number.isFinite(compareAtPrice) || compareAtPrice < 0) {
        setError("Please enter a valid compare-at price.");
        return;
      }
    }

    setSaving(true);

    let productCreated = false;

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          sku: form.sku.trim() || null,
          price,
          compareAtPrice,
          shortDescription: form.shortDescription.trim() || null,
          description: form.description.trim() || null,
          status: form.status,
          isAvailable: form.isAvailable,
          isFeatured: form.isFeatured,
          categoryId: selectedSubcategory
            ? Number(selectedSubcategory)
            : selectedMainCategory
              ? Number(selectedMainCategory)
              : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create product.");
      }

      const createdProductId = Number(
        data.product?.id ?? data.id
      );

      if (
        !Number.isInteger(createdProductId) ||
        createdProductId <= 0
      ) {
        throw new Error(
          "The product API did not return a valid product ID. Please check the API response."
        );
      }

      productCreated = true;

      if (selectedImages.length > 0) {
        try {
          await uploadImages(
            createdProductId,
            selectedImages
          );
        } catch (imageError) {
          setMessage(
            "Product created, but image upload failed. You can try uploading the images from the product list."
          );

          setError(
            imageError instanceof Error
              ? imageError.message
              : "The product was created, but its images could not be uploaded."
          );

          resetForm();
          setShowForm(false);
          await loadProducts();
          return;
        }
      }

      setMessage(
        selectedImages.length > 0
          ? "Product and images saved successfully."
          : "Product created successfully."
      );

      resetForm();
      setShowForm(false);

      await loadProducts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving the product."
      );

      if (productCreated) {
        await loadProducts();
      }
    } finally {
      setSaving(false);
    }
  }

  const filteredProducts = products.filter((product) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      product.name.toLowerCase().includes(query) ||
      product.slug.toLowerCase().includes(query) ||
      (product.sku ?? "").toLowerCase().includes(query)
    );
  });

  const publishedCount = products.filter(
    (product) => product.status === "PUBLISHED"
  ).length;

  const availableCount = products.filter(
    (product) => product.isAvailable
  ).length;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin/dashboard"
              className="mb-3 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-red-600"
            >
              <span aria-hidden="true">←</span>
              Back to Dashboard
            </Link>

            <h1 className="text-3xl font-bold tracking-tight">
              Product Management
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Create and manage products for Oscar Trading.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowForm((current) => !current);
              setMessage("");
              setError("");

              if (showForm) {
                resetForm();
              }
            }}
            className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            {showForm ? "Close Form" : "+ Add Product"}
          </button>
        </div>

        {/* Feedback */}
        {message && (
          <div
            role="status"
            className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Summary */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Products</p>
            <p className="mt-2 text-3xl font-bold">
              {products.length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Published</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {publishedCount}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Available</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {availableCount}
            </p>
          </div>
        </div>

        {/* Create Product Form */}
        {showForm && (
          <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <h2 className="text-xl font-bold">
                Add New Product
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Enter product information and select product images.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Product Name *
                  </label>
                  <input
                    className={inputClass}
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    placeholder="e.g. Stainless Steel Kettle"
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    SKU (Optional)
                  </label>
                  <input
                    className={inputClass}
                    value={form.sku}
                    onChange={(event) =>
                      updateField("sku", event.target.value)
                    }
                    placeholder="e.g. KTL-001"
                  />
                </div>

                <div>
                  <label className={labelClass}>Main Category</label>
                  <select
                    className={inputClass}
                    value={selectedMainCategory}
                    disabled={saving || categories.length === 0}
                    onChange={(event) => {
                      setSelectedMainCategory(event.target.value);
                      setSelectedSubcategory("");
                    }}
                  >
                    <option value="">Select a main category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={String(category.id)}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      No categories found. Create categories first.
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Subcategory</label>
                  <select
                    className={inputClass}
                    value={selectedSubcategory}
                    disabled={
                      saving ||
                      !selectedMainCategory ||
                      (categories.find(
                        (category) => String(category.id) === selectedMainCategory
                      )?.children.length ?? 0) === 0
                    }
                    required={
                      (categories.find(
                        (category) => String(category.id) === selectedMainCategory
                      )?.children.length ?? 0) > 0
                    }
                    onChange={(event) => setSelectedSubcategory(event.target.value)}
                  >
                    <option value="">
                      {!selectedMainCategory
                        ? "Select a main category first"
                        : (categories.find(
                            (category) => String(category.id) === selectedMainCategory
                          )?.children.length ?? 0) > 0
                          ? "Select a subcategory"
                          : "No subcategories"}
                    </option>
                    {categories
                      .find((category) => String(category.id) === selectedMainCategory)
                      ?.children.map((subcategory) => (
                        <option key={subcategory.id} value={String(subcategory.id)}>
                          {subcategory.name}
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Choose a subcategory when available; otherwise the main category is used.
                  </p>
                </div>


                <div>
                  <label className={labelClass}>
                    Selling Price (LKR) *
                  </label>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      updateField("price", event.target.value)
                    }
                    placeholder="6500.00"
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Compare-at Price (LKR)
                  </label>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.compareAtPrice}
                    onChange={(event) =>
                      updateField(
                        "compareAtPrice",
                        event.target.value
                      )
                    }
                    placeholder="Optional original price"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Use this to show a previous price or discount.
                  </p>
                </div>

                <div className="min-w-0">
                  <label className={labelClass}>
                    Short Description
                  </label>
                  <input
                    className={inputClass}
                    value={form.shortDescription}
                    onChange={(event) =>
                      updateField(
                        "shortDescription",
                        event.target.value
                      )
                    }
                    placeholder="A short summary for product cards"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>
                    Full Description
                  </label>
                  <textarea
                    className={inputClass}
                    rows={5}
                    value={form.description}
                    onChange={(event) =>
                      updateField(
                        "description",
                        event.target.value
                      )
                    }
                    placeholder="Enter detailed product information..."
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Product Status
                  </label>
                  <select
                    className={inputClass}
                    value={form.status}
                    onChange={(event) =>
                      updateField(
                        "status",
                        event.target.value as ProductForm["status"]
                      )
                    }
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                {/* Product Images */}
                <div className="md:col-span-2">
                  <label className={labelClass}>
                    Product Images (Maximum 5)
                  </label>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={saving}
                    onChange={(event) => {
                      handleImageSelection(event.target.files);
                      event.currentTarget.value = "";
                    }}
                    className={inputClass}
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    JPEG, PNG, or WebP. Maximum 5 images, 5MB each.
                  </p>

                  
{selectedImages.length > 0 && (
  <div className="mt-4">
    {/* Selected images heading */}
    <div className="mb-3 flex items-center justify-between">
      <p className="text-sm font-medium text-gray-700">
        {selectedImages.length} image(s) selected
      </p>

      <button
        type="button"
        disabled={saving}
        onClick={() => setSelectedImages([])}
        className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
      >
        Remove all
      </button>
    </div>

    {/* Compact image gallery */}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {selectedImages.map((file, index) => (
        <div
          key={`${file.name}-${index}`}
          className="relative min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white"
        >
          {/* Individual remove button */}
          <button
            type="button"
            disabled={saving}
            onClick={() => removeSelectedImage(index)}
            aria-label={`Remove ${file.name}`}
            title="Remove image"
            className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-lg font-semibold text-gray-700 shadow-md hover:bg-red-600 hover:text-white disabled:opacity-50"
          >
            ×
          </button>

          {/* Thumbnail */}
          <div className="flex h-28 items-center justify-center bg-gray-50 p-2">
            {imagePreviews[index] && (
              <img
                src={imagePreviews[index]}
                alt={file.name}
                className="h-full w-full rounded object-contain"
              />
            )}
          </div>

          {/* Filename and size */}
          <div className="border-t border-gray-100 p-2">
            <p
              className="truncate text-xs font-medium text-gray-700"
              title={file.name}
            >
              {file.name}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
                </div>
              </div>

              {/* Product switches */}
              <div className="flex flex-col gap-4 rounded-lg bg-gray-50 p-4 sm:flex-row sm:gap-8">
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isAvailable}
                    onChange={(event) =>
                      updateField(
                        "isAvailable",
                        event.target.checked
                      )
                    }
                    className="h-4 w-4 accent-red-600"
                  />
                  <span>
                    <span className="block font-medium">
                      Available for purchase
                    </span>
                    <span className="text-xs text-gray-500">
                      Customers can order this product.
                    </span>
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(event) =>
                      updateField(
                        "isFeatured",
                        event.target.checked
                      )
                    }
                    className="h-4 w-4 accent-red-600"
                  />
                  <span>
                    <span className="block font-medium">
                      Featured product
                    </span>
                    <span className="text-xs text-gray-500">
                      Mark this product as featured.
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                    setError("");
                  }}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? selectedImages.length > 0
                      ? "Saving Product & Images..."
                      : "Saving..."
                    : "Save Product"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Product List */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">
                All Products
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {filteredProducts.length} product
                {filteredProducts.length === 1 ? "" : "s"} found
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className={`${inputClass} sm:w-64`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, SKU or slug..."
              />

              <button
                type="button"
                onClick={() => void loadProducts()}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-gray-500">
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mb-3 text-4xl" aria-hidden="true">
                📦
              </div>
              <h3 className="font-semibold text-gray-900">
                {search ? "No matching products" : "No products yet"}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {search
                  ? "Try a different search term."
                  : "Add your first product to get started."}
              </p>

              {!search && (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="mt-5 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  + Add First Product
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">
                      Product
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      SKU
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Price
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Status
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Availability
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Featured
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Images
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map((product) => {
                    const primaryImage =
                      product.images?.find(
                        (image) => image.isPrimary
                      ) ?? product.images?.[0];

                    return (
                      <tr
                        key={product.id}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {primaryImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={primaryImage.imageUrl}
                                alt={
                                  primaryImage.altText ||
                                  product.name
                                }
                                className="h-12 w-12 rounded-lg border border-gray-200 object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xl">
                                📦
                              </div>
                            )}

                            <div>
                              <p className="font-semibold text-gray-900">
                                {product.name}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                /product/{product.slug}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {product.sku || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {formatPrice(product.price)}
                          </p>

                          {product.compareAtPrice != null && (
                            <p className="mt-1 text-xs text-gray-400 line-through">
                              {formatPrice(product.compareAtPrice)}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(product.status)}`}
                          >
                            {product.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {product.isAvailable ? (
                            <span className="font-medium text-green-700">
                              Available
                            </span>
                          ) : (
                            <span className="font-medium text-red-600">
                              Unavailable
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {product.isFeatured ? (
                            <span className="font-medium text-amber-600">
                              ★ Yes
                            </span>
                          ) : (
                            <span className="text-gray-400">
                              No
                            </span>
                          )}
                        </td>

                        {/* Image upload */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-2">
                            <span className="text-xs text-gray-500">
                              {product.images?.length ?? 0} image(s)
                            </span>

                            <label
                              className={`inline-flex w-fit cursor-pointer items-center rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 ${
                                uploadingProductId === product.id
                                  ? "pointer-events-none opacity-50"
                                  : ""
                              }`}
                            >
                              {uploadingProductId === product.id
                                ? "Uploading..."
                                : "＋ Upload Images"}

                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                disabled={
                                  uploadingProductId === product.id
                                }
                                className="hidden"
                                onChange={(event) => {
                                  void handleImageUpload(
                                    product.id,
                                    event.target.files
                                  );

                                  event.currentTarget.value = "";
                                }}
                              />
                            </label>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-5 text-xs text-gray-400">
          Product data is loaded from your store database.
        </p>
      </div>
    </main>
  );
}

