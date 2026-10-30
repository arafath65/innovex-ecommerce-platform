"use client";

import Image from "next/image";

import Link from "next/link";


import { useRouter } from "next/navigation";

import {
  Ban,
  Check,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Image as ImageIcon,
  Plus,
  Power,
  RefreshCw,
  Search,
  Star,
  Upload,
  X,
} from "lucide-react";

import { useGSAP } from "@gsap/react";

import gsap from "gsap";

import {
  FormEvent,
  KeyboardEvent,
  Ref,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type ProductImage = {
  id: number;
  imageUrl: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

type ProductCategory = {
  id: number;
  name: string;
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
  category: ProductCategory | null;
  images: ProductImage[];
};

type CategoryChild = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  active?: boolean;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  active?: boolean;
  children?: CategoryChild[];
};

type ProductForm = {
  barcode: string;
  brand: string;
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

type SelectedImage = {
  file: File;
  preview: string;
};

type ProductStats = {
  total: number;
  published: number;
  draft: number;
  unavailable: number;
  featured: number;
};

type ProductPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type PaginationItem = number | "ellipsis";

function buildPaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    );
  }

  const items: PaginationItem[] = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    items.push("ellipsis");
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) {
    items.push("ellipsis");
  }

  items.push(totalPages);

  return items;
}

const EMPTY_FORM: ProductForm = {
  barcode: "",
  brand: "",
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

function formatPrice(value: string | number | null) {
  const amount = Number(value);

  return Number.isFinite(amount)
    ? `LKR ${amount.toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : "Contact for Price";
}

function resolveImageUrl(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  let url = value.trim().replace(/\\/g, "/");

  if (
    /^https?:\/\//i.test(url) ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  url = url
    .replace(/^\.\//, "")
    .replace(/^public\//i, "")
    .replace(/^\/public\//i, "/");

  const publicIndex = url.toLowerCase().indexOf("/public/");

  if (publicIndex >= 0) {
    url = url.slice(publicIndex + 8);
  }

  return url.startsWith("/") ? url : `/${url}`;
}

function getPrimaryImage(product: Product) {
  const image =
    product.images.find((item) => item.isPrimary) ??
    product.images[0];

  return resolveImageUrl(image?.imageUrl);
}

function statusClasses(status: ProductStatus) {
  if (status === "PUBLISHED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "ARCHIVED") {
    return "border-slate-200 bg-slate-100 text-slate-500";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function imageValidation(files: File[]) {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  const invalid = files.find(
    (file) => !allowed.includes(file.type),
  );

  if (invalid) {
    return `${invalid.name} is not supported. Use JPG, PNG or WebP.`;
  }

  return "";
}

function focusNextOnEnter(
  event: KeyboardEvent<HTMLElement>,
  nextRef: { current: HTMLElement | null },
) {
  if (event.key !== "Enter") return;

  event.preventDefault();
  nextRef.current?.focus();
}

const IMAGE_TARGET_BYTES = 1_900_000;
const IMAGE_MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const IMAGE_MAX_DIMENSION = 2400;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new Error("Failed to process image."),
          );
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}

async function compressImageTo2MB(
  file: File,
): Promise<File> {
  if (file.size > IMAGE_MAX_SOURCE_BYTES) {
    throw new Error(
      `${file.name} is larger than 25 MB. Please choose a smaller image.`,
    );
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new window.Image();

    const loaded = new Promise<void>(
      (resolve, reject) => {
        image.onload = () => resolve();

        image.onerror = () =>
          reject(
            new Error(
              `Could not read ${file.name}.`,
            ),
          );
      },
    );

    image.src = objectUrl;

    await loaded;

    let width = image.naturalWidth;
    let height = image.naturalHeight;

    const longestSide = Math.max(
      width,
      height,
    );

    if (
      longestSide >
      IMAGE_MAX_DIMENSION
    ) {
      const scale =
        IMAGE_MAX_DIMENSION /
        longestSide;

      width = Math.max(
        1,
        Math.round(width * scale),
      );

      height = Math.max(
        1,
        Math.round(height * scale),
      );
    }

    const canvas =
      document.createElement("canvas");

    let quality = 0.82;

    for (
      let attempt = 0;
      attempt < 12;
      attempt += 1
    ) {
      canvas.width = width;
      canvas.height = height;

      const context =
        canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Your browser could not prepare the image.",
        );
      }

      context.clearRect(
        0,
        0,
        width,
        height,
      );

      context.drawImage(
        image,
        0,
        0,
        width,
        height,
      );

      const blob =
        await canvasToBlob(
          canvas,
          "image/webp",
          quality,
        );

      if (
        blob.size <=
        IMAGE_TARGET_BYTES
      ) {
        const baseName =
          file.name.replace(
            /\.[^/.]+$/,
            "",
          );

        return new File(
          [blob],
          `${baseName}.webp`,
          {
            type: "image/webp",
            lastModified:
              Date.now(),
          },
        );
      }

      if (quality > 0.5) {
        quality = Math.max(
          0.5,
          quality - 0.07,
        );
      } else {
        width = Math.max(
          640,
          Math.round(width * 0.85),
        );

        height = Math.max(
          640,
          Math.round(height * 0.85),
        );

        quality = 0.78;
      }
    }

    throw new Error(
      `${file.name} could not be compressed below 2 MB.`,
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function ProductsList() {
  const rootRef = useRef<HTMLDivElement>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const skuRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const brandRef = useRef<HTMLInputElement>(null);
  const mainCategoryRef = useRef<HTMLSelectElement>(null);
  const subcategoryRef = useRef<HTMLSelectElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const compareAtPriceRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLSelectElement>(null);
  const availableRef = useRef<HTMLButtonElement>(null);
  const featuredRef = useRef<HTMLButtonElement>(null);
  const shortDescriptionRef = useRef<HTMLTextAreaElement>(null);

  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);

  const [pagination, setPagination] =
    useState<ProductPagination>({
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 0,
    });

  const [stats, setStats] = useState<ProductStats>({
    total: 0,
    published: 0,
    draft: 0,
    unavailable: 0,
    featured: 0,
  });

  const [expandedProductIds, setExpandedProductIds] =
    useState<Set<number>>(new Set());

  const [actionProductId, setActionProductId] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(true);

  const [loadingCategories, setLoadingCategories] =
    useState(true);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

  const [availabilityFilter, setAvailabilityFilter] =
    useState("");

  const [featuredFilter, setFeaturedFilter] =
    useState("");

  const [uploadingProductId, setUploadingProductId] =
    useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [form, setForm] =
    useState<ProductForm>(EMPTY_FORM);

  const [selectedMainCategory, setSelectedMainCategory] =
    useState("");

  const [selectedSubcategory, setSelectedSubcategory] =
    useState("");

  const [selectedImages, setSelectedImages] =
    useState<SelectedImage[]>([]);

    const [compressingImages, setCompressingImages] =
  useState(false);

  const [globalLookupLoading, setGlobalLookupLoading] =
    useState(false);

  const [globalProductFound, setGlobalProductFound] =
    useState<boolean | null>(null);

  const selectedMain = categories.find(
    (category) =>
      String(category.id) === selectedMainCategory,
  );

  const activeFilters = Boolean(
    search ||
      statusFilter ||
      availabilityFilter ||
      featuredFilter,
  );

  useGSAP(
    () => {
      gsap
        .timeline({
          defaults: {
            ease: "power3.out",
          },
        })
        .from(".products-header", {
          opacity: 0,
          y: 14,
          duration: 0.55,
        })
        .from(
          ".products-stat",
          {
            opacity: 0,
            y: 8,
            duration: 0.35,
            stagger: 0.06,
          },
          "-=0.2",
        )
        .from(
          ".products-toolbar",
          {
            opacity: 0,
            y: 8,
            duration: 0.35,
          },
          "-=0.12",
        )
        .from(
          ".products-table",
          {
            opacity: 0,
            y: 8,
            duration: 0.4,
          },
          "-=0.12",
        );
    },
    {
      scope: rootRef,
    },
  );

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/admin/categories",
        { cache: "no-store" },
      );

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load categories.",
        );
      }

      setCategories(
        Array.isArray(data.categories)
          ? data.categories
          : [],
      );
      setLoadingCategories(false);
    } catch (err) {
      setLoadingCategories(false);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load categories.",
      );
    }
  }, [router]);

  const loadProducts = useCallback(
    async (
      requestedPage: number,
      requestedPageSize: number,
    ) => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        params.set("page", String(requestedPage));
        params.set("pageSize", String(requestedPageSize));

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (statusFilter) {
          params.set("status", statusFilter);
        }

        if (availabilityFilter) {
          params.set("availability", availabilityFilter);
        }

        if (featuredFilter) {
          params.set("featured", featuredFilter);
        }

        const response = await fetch(
          `/api/admin/products?${params.toString()}`,
          { cache: "no-store" },
        );

        if (response.status === 401) {
          router.push("/admin/login");
          return;
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              data.error ||
              "Failed to load products.",
          );
        }

        const nextPagination: ProductPagination = {
          page: Number(data.pagination?.page ?? requestedPage),
          pageSize: Number(
            data.pagination?.pageSize ?? requestedPageSize,
          ),
          total: Number(data.pagination?.total ?? 0),
          totalPages: Number(data.pagination?.totalPages ?? 0),
        };

        setProducts(
          Array.isArray(data.products)
            ? data.products
            : [],
        );

        setPagination(nextPagination);

        if (data.stats && typeof data.stats === "object") {
          setStats({
            total: Number(data.stats.total ?? 0),
            published: Number(data.stats.published ?? 0),
            draft: Number(data.stats.draft ?? 0),
            unavailable: Number(data.stats.unavailable ?? 0),
            featured: Number(data.stats.featured ?? 0),
          });
        }

        if (
          nextPagination.totalPages > 0 &&
          requestedPage > nextPagination.totalPages
        ) {
          setPagination((current) => ({
            ...current,
            page: nextPagination.totalPages,
          }));
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load products.",
        );
        setProducts([]);
      } finally {
        setLoading(false);
      }
    },
    [
      search,
      statusFilter,
      availabilityFilter,
      featuredFilter,
      router,
    ],
  );

  useEffect(() => {
  const timer = window.setTimeout(() => {
    void loadCategories();
  }, 0);

  return () => {
    window.clearTimeout(timer);
  };
}, [loadCategories]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProducts(
        pagination.page,
        pagination.pageSize,
      );
    }, 220);

    return () => window.clearTimeout(timer);
  }, [
    pagination.page,
    pagination.pageSize,
    loadProducts,
  ]);

  async function refreshProducts() {
    await loadProducts(
      pagination.page,
      pagination.pageSize,
    );
  }

  function goToPage(nextPage: number) {    if (
      loading ||
      nextPage < 1 ||
      nextPage > pagination.totalPages ||
      nextPage === pagination.page
    ) {
      return;
    }

    setPagination((current) => ({
      ...current,
      page: nextPage,
    }));

    setExpandedProductIds(new Set());
  }

  function changePageSize(nextPageSize: number) {
    if (nextPageSize === pagination.pageSize) {
      return;
    }

    setPagination((current) => ({
      ...current,
      page: 1,
      pageSize: nextPageSize,
    }));

    setExpandedProductIds(new Set());
  }

  function toggleProductImages(productId: number) {
    setExpandedProductIds((current) => {
      const next = new Set(current);

      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }

      return next;
    });
  }

  async function handleToggleAvailability(product: Product) {
    if (actionProductId !== null) {
      return;
    }

    const nextAvailable = !product.isAvailable;

    if (!nextAvailable) {
      const confirmed = window.confirm(
        `Deactivate "${product.name}"?\n\nCustomers will no longer be able to purchase this product.`,
      );

      if (!confirmed) {
        return;
      }
    }

    setActionProductId(product.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/products/${product.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: product.name,
            sku: product.sku,
            price:
              product.price == null
                ? null
                : Number(product.price),
            compareAtPrice:
              product.compareAtPrice == null
                ? null
                : Number(product.compareAtPrice),
            shortDescription:
              product.shortDescription,
            description: product.description,
            status: product.status,
            isAvailable: nextAvailable,
            isFeatured: product.isFeatured,
            categoryId: product.category?.id ?? null,
          }),
        },
      );

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            data.error ||
            `Failed to ${
              nextAvailable ? "activate" : "deactivate"
            } product.`,
        );
      }

      setSuccess(
        nextAvailable
          ? "Product activated successfully."
          : "Product deactivated successfully.",
      );

      await refreshProducts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update product availability.",
      );
    } finally {
      setActionProductId(null);
    }
  }

  function updateForm<K extends keyof ProductForm>(
    field: K,
    value: ProductForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    selectedImages.forEach((image) =>
      URL.revokeObjectURL(image.preview),
    );

    setForm(EMPTY_FORM);

    setSelectedMainCategory("");

    setSelectedSubcategory("");

    setSelectedImages([]);

    setGlobalLookupLoading(false);

    setGlobalProductFound(null);
  }

  function openCreateModal() {
    resetForm();

    setError("");

    setSuccess("");

    setModalOpen(true);

    requestAnimationFrame(() => {
      barcodeRef.current?.focus();
    });

    requestAnimationFrame(() => {
      if (!modalRef.current) {
        return;
      }

      gsap.fromTo(
        modalRef.current,
        {
          opacity: 0,
          y: 15,
          scale: 0.985,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.35,
          ease: "power3.out",
        },
      );
    });
  }

  function closeCreateModal() {
    if (saving) {
      return;
    }

    const close = () => {
      resetForm();
      setModalOpen(false);
    };

    if (modalRef.current) {
      gsap.to(
        modalRef.current,
        {
          opacity: 0,
          y: 10,
          scale: 0.99,
          duration: 0.18,
          onComplete: close,
        },
      );
    } else {
      close();
    }
  }

  async function lookupGlobalProduct(
    value?: string,
  ): Promise<"found" | "missing" | "error"> {
    const barcode = (
      value ?? form.barcode
    ).trim();

    if (!barcode) {
      setGlobalProductFound(null);

      setError(
        "Please enter a barcode first.",
      );

      return "error";
    }

    setGlobalLookupLoading(true);

    setError("");

    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/global-products?barcode=${encodeURIComponent(
          barcode,
        )}`,
        {
          cache: "no-store",
        },
      );

      if (response.status === 401) {
        router.push("/admin/login");
        return "error";
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to search the global product catalog.",
        );
      }

      if (
        !data.found ||
        !data.globalProduct
      ) {

        setGlobalProductFound(false);

        setForm((current) => ({
          ...current,
          barcode,
        }));

        setSuccess(
          "Barcode not found. Saving this product will create a new global catalog entry.",
        );

        return "missing";
      }

      const globalProduct =
        data.globalProduct;

      setGlobalProductFound(true);

      setForm((current) => ({
        ...current,
        barcode:
          globalProduct.barcode ??
          barcode,
        brand:
          globalProduct.brand ?? "",
        name:
          globalProduct.name ?? "",
        shortDescription:
          globalProduct.shortDescription ??
          "",
        description:
          globalProduct.description ?? "",
      }));

      setSuccess(
        "Global product found. Product details have been filled automatically.",
      );

      return "found";
    } catch (err) {
      setGlobalProductFound(null);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to search the global product catalog.",
      );

      return "error";
    } finally {
      setGlobalLookupLoading(false);
    }
  }

  async function handleImageSelection(
  files: FileList | null,
) {
  if (!files) {
    return;
  }

  const chosen = Array.from(files);

  if (
    selectedImages.length +
      chosen.length >
    5
  ) {
    setError(
      "You can select a maximum of 5 images.",
    );
    return;
  }

  const validationError =
    imageValidation(chosen);

  if (validationError) {
    setError(validationError);
    return;
  }

  setCompressingImages(true);
  setError("");
  setSuccess("");

  try {
    const compressedImages: SelectedImage[] =
      [];

    for (const file of chosen) {
      const compressedFile =
        await compressImageTo2MB(file);

      compressedImages.push({
        file: compressedFile,
        preview:
          URL.createObjectURL(
            compressedFile,
          ),
      });
    }

    setSelectedImages((current) => [
      ...current,
      ...compressedImages,
    ]);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to optimize product images.",
    );
  } finally {
    setCompressingImages(false);
  }
}

  async function uploadImages(
    productId: number,
    files: File[],
  ) {
    if (!files.length) {
      return;
    }

    setUploadingProductId(
      productId,
    );

    try {
      const formData =
        new FormData();

      files.forEach((file) => {
        formData.append(
          "images",
          file,
        );
      });

      const response =
        await fetch(
          `/api/admin/products/${productId}/images`,
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
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Failed to upload product images.",
        );
      }
    } finally {
      setUploadingProductId(
        null,
      );
    }
  }

    async function handleImageUpload(
    productId: number,
    files: FileList | null,
  ) {
    if (!files?.length) {
      return;
    }

    const chosen =
      Array.from(files);

    if (chosen.length > 5) {
      setError(
        "You can upload a maximum of 5 images at a time.",
      );

      return;
    }

    const validationError =
      imageValidation(chosen);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");

    try {
      await uploadImages(
        productId,
        chosen,
      );

      setSuccess(
        "Product images uploaded successfully.",
      );

      await refreshProducts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload images.",
      );
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setSaving(true);

    setError("");

    setSuccess("");

    try {
      const name =
        form.name.trim();

      if (!name) {
        throw new Error(
          "Product name is required.",
        );
      }

      const price =
        Number(form.price);

      if (
        !form.price.trim() ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        throw new Error(
          "Please enter a valid selling price.",
        );
      }

      if (!selectedMainCategory) {
        throw new Error(
          "Please select a main category.",
        );
      }

      const categoryId =
        selectedSubcategory
          ? Number(
              selectedSubcategory,
            )
          : Number(
              selectedMainCategory,
            );

      if (
        !Number.isInteger(
          categoryId,
        ) ||
        categoryId <= 0
      ) {
        throw new Error(
          "Please select a valid category.",
        );
      }

      const compareAtPrice =
        form.compareAtPrice.trim()
          ? Number(
              form.compareAtPrice,
            )
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

      const response =
        await fetch(
          "/api/admin/products/create",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              barcode:
                form.barcode.trim() ||
                null,
              brand:
                form.brand.trim() ||
                null,
              name,
              sku:
                form.sku.trim() ||
                null,
              price,
              compareAtPrice,
              shortDescription:
                form.shortDescription.trim() ||
                null,
              description:
                form.description.trim() ||
                null,
              status:
                form.status,
              isAvailable:
                form.isAvailable,
              isFeatured:
                form.isFeatured,
              categoryId,
            }),
          },
        );

      if (response.status === 401) {
        router.push(
          "/admin/login",
        );

        return;
      }

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            data.error ||
            "Failed to create product.",
        );
      }

      const productId =
        Number(
          data.product?.id ??
            data.id,
        );

      if (
        !Number.isInteger(
          productId,
        ) ||
        productId <= 0
      ) {
        throw new Error(
          "The product API did not return a valid product ID.",
        );
      }

      let imagesUploaded =
        selectedImages.length ===
        0;

      if (
        selectedImages.length
      ) {
        try {
          await uploadImages(
            productId,
            selectedImages.map(
              (image) =>
                image.file,
            ),
          );

          imagesUploaded = true;
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "The product was created, but image upload failed.",
          );
        }
      }

      selectedImages.forEach(
        (image) =>
          URL.revokeObjectURL(
            image.preview,
          ),
      );

      setSelectedImages([]);

      setForm(EMPTY_FORM);

      setSelectedMainCategory("");

      setSelectedSubcategory("");

      setGlobalProductFound(
        null,
      );

      setModalOpen(false);

      if (imagesUploaded) {
        setSuccess(
          selectedImages.length
            ? "Product and images saved successfully."
            : "Product created successfully.",
        );
      }

      await refreshProducts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create product.",
      );
    } finally {
      setSaving(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setAvailabilityFilter("");
    setFeaturedFilter("");
    setPagination((current) => ({
      ...current,
      page: 1,
    }));
    setExpandedProductIds(new Set());
  }

  return (
    <div
      ref={rootRef}
      className="mx-auto w-full max-w-[1480px]"
    >
      {/* HEADER */}

      <div className="products-header mb-5 flex flex-col gap-4 border-b border-black/7 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/35">
            <span>Catalog</span>

            <span className="text-black/15">
              /
            </span>

            <span className="text-[var(--admin-green)]">
              Products
            </span>
          </div>

          <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-black">
            Products
          </h1>

          <p className="mt-1 text-[12px] text-black/43">
  Manage your store catalog, pricing and images.
</p>
        </div>

        <button
          type="button"
          onClick={
            openCreateModal
          }
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#d71920] px-4 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#c5151c]"
        >
          <Plus size={15} />

          Add product
        </button>
      </div>

      {/* FEEDBACK */}

      {error ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[11px] text-red-700">
          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      {success ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[11px] text-emerald-700">
          <span className="flex items-center gap-2">
            <Check size={14} />

            {success}
          </span>

          <button
            type="button"
            onClick={() =>
              setSuccess("")
            }
            aria-label="Dismiss success"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      {/* STATS */}

      <div className="mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-5">
        <StatCard
          label="Total"
          value={stats.total}
        />

        <StatCard
          label="Published"
          value={stats.published}
          tone="green"
        />

        <StatCard
          label="Draft"
          value={stats.draft}
          tone="amber"
        />

        <StatCard
          label="Unavailable"
          value={stats.unavailable}
          tone="red"
        />

        <StatCard
          label="Featured"
          value={stats.featured}
          tone="dark"
        />
      </div>

      {/* FILTERS */}

      <section className="products-toolbar mb-4 rounded-xl border border-black/7 bg-white p-2.5 shadow-sm">
        <div className="grid gap-2.5 lg:grid-cols-[minmax(240px,1.7fr)_165px_170px_150px_auto]">
          <label className="relative block">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/28"
            />

            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPagination((current) => ({
                  ...current,
                  page: 1,
                }));
              }}
              placeholder="Search products, SKU or slug..."
              className="h-10 w-full rounded-lg border border-black/8 bg-[#fafafa] pl-9 pr-3 text-[12px] outline-none focus:border-[var(--admin-green)]"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPagination((current) => ({
                ...current,
                page: 1,
              }));
            }}
            className="h-10 rounded-lg border border-black/8 bg-[#fafafa] px-3 text-[11px] outline-none"
          >
            <option value="">
              All status
            </option>

            <option value="PUBLISHED">
              Published
            </option>

            <option value="DRAFT">
              Draft
            </option>

            <option value="ARCHIVED">
              Archived
            </option>
          </select>

          <select
            value={availabilityFilter}
            onChange={(event) => {
              setAvailabilityFilter(event.target.value);
              setPagination((current) => ({
                ...current,
                page: 1,
              }));
            }}
            className="h-10 rounded-lg border border-black/8 bg-[#fafafa] px-3 text-[11px] outline-none"
          >
            <option value="">
              All availability
            </option>

            <option value="available">
              Available
            </option>

            <option value="unavailable">
              Unavailable
            </option>
          </select>

          <select
            value={featuredFilter}
            onChange={(event) => {
              setFeaturedFilter(event.target.value);
              setPagination((current) => ({
                ...current,
                page: 1,
              }));
            }}
            className="h-10 rounded-lg border border-black/8 bg-[#fafafa] px-3 text-[11px] outline-none"
          >
            <option value="">
              All products
            </option>

            <option value="featured">
              Featured
            </option>

            <option value="not-featured">
              Not featured
            </option>
          </select>

          <button
            type="button"
            onClick={() =>
              activeFilters
                ? clearFilters()
                : void refreshProducts()
            }
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-black/8 px-3 text-[11px] font-semibold text-black/50"
          >
            {activeFilters ? (
              <X size={14} />
            ) : (
              <RefreshCw
                size={14}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />
            )}

            {activeFilters
              ? "Clear"
              : "Refresh"}
          </button>
        </div>
      </section>

      {/* PRODUCT TABLE */}

      <section className="products-table overflow-hidden rounded-xl border border-black/7 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-black/7 px-4 py-3.5">
          <div>
            <h2 className="text-[13px] font-semibold">
              Catalog
            </h2>

            <p className="mt-0.5 text-[10px] text-black/33">
              {pagination.total === 0
                ? "0 products"
                : `${
                    (pagination.page - 1) *
                      pagination.pageSize +
                    1
                  }–${Math.min(
                    pagination.page *
                      pagination.pageSize,
                    pagination.total,
                  )} of ${pagination.total} products`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void refreshProducts()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-black/32 transition hover:text-[#d71920] disabled:opacity-45"
          >
            <RefreshCw
              size={12}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* TABLE HEADER */}
        <div className="hidden grid-cols-[minmax(0,2fr)_100px_105px_90px_105px_148px] gap-3 border-b border-black/6 bg-[#fafafa] px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-black/29 lg:grid lg:px-5">
          <span>Product</span>
          <span>Category</span>
          <span>Price</span>
          <span>Status</span>
          <span>Availability</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div className="px-5 py-14 text-center text-[11px] text-black/34">
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-black/[0.035] text-black/23">
              <ImageIcon size={18} />
            </div>

            <p className="text-[12px] font-semibold text-black/72">
              {activeFilters
                ? "No matching products"
                : "No products yet"}
            </p>

            <p className="mt-1 text-[10px] text-black/33">
              {activeFilters
                ? "Try clearing your filters."
                : "Create your first product to start the catalog."}
            </p>

            {!activeFilters ? (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#d71920] px-3.5 py-2 text-[10px] font-semibold text-white"
              >
                <Plus size={13} />
                Add first product
              </button>
            ) : null}
          </div>
        ) : (
          <div className="min-w-0 divide-y divide-black/6">
            {products.map((product) => {
              const primary = getPrimaryImage(product);
              const expanded = expandedProductIds.has(product.id);
              const actionBusy = actionProductId === product.id;
              const uploadBusy =
                uploadingProductId === product.id;

              return (
                <div key={product.id} className="min-w-0">
                  <div className="product-row grid min-w-0 gap-3 px-3.5 py-3.5 transition hover:bg-[#fcfcfb] lg:grid-cols-[minmax(0,2fr)_100px_105px_90px_105px_148px] lg:items-center lg:gap-3 lg:px-5">
                    {/* PRODUCT */}
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-black/7 bg-[#f6f6f3]">
                        {primary ? (
                          <Image
                            src={primary}
                            alt={product.name}
                            width={56}
                            height={56}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <ImageIcon
                            size={18}
                            className="text-black/18"
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="group inline-flex max-w-full items-center gap-1.5"
                        >
                          <span className="truncate text-[12px] font-semibold text-black/80 group-hover:text-[#d71920]">
                            {product.name}
                          </span>
                          <span className="text-black/20 transition group-hover:translate-x-0.5 group-hover:text-[#d71920]">
                            →
                          </span>
                        </Link>

                        <p className="mt-0.5 truncate text-[9px] text-black/29">
                          {product.sku || product.slug}
                        </p>

                        <p className="mt-1 text-[9px] text-black/25">
                          {product.images.length} image
                          {product.images.length === 1 ? "" : "s"}
                          {product.isFeatured ? (
                            <span className="ml-2 text-amber-500">
                              • Featured
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>

                    {/* CATEGORY */}
                    <div className="hidden min-w-0 lg:block">
                      <span className="block truncate text-[10px] font-medium text-black/51">
                        {product.category?.name || "Uncategorized"}
                      </span>
                    </div>

                    {/* PRICE */}
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-black/76">
                        {formatPrice(product.price)}
                      </p>
                      {product.compareAtPrice !== null ? (
                        <p className="mt-0.5 truncate text-[9px] text-black/22 line-through">
                          {formatPrice(product.compareAtPrice)}
                        </p>
                      ) : null}
                    </div>

                    {/* STATUS */}
                    <div className="min-w-0">
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.07em] ${statusClasses(product.status)}`}
                      >
                        {product.status}
                      </span>
                    </div>

                    {/* AVAILABILITY */}
                    <div className="min-w-0 text-[9px] font-semibold">
                      <span
                        className={
                          product.isAvailable
                            ? "whitespace-nowrap text-emerald-600"
                            : "whitespace-nowrap text-red-600"
                        }
                      >
                        {product.isAvailable
                          ? "● Available"
                          : "● Unavailable"}
                      </span>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex min-w-0 flex-nowrap items-center gap-1.5">
                      <label
                        className={`inline-flex h-8 min-w-0 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-black/8 px-2.5 text-[9px] font-semibold text-black/48 transition hover:border-black/15 hover:text-black ${
                          uploadBusy
                            ? "pointer-events-none opacity-45"
                            : ""
                        }`}
                        title="Upload images"
                      >
                        {uploadBusy ? (
                          <RefreshCw
                            size={12}
                            className="animate-spin"
                          />
                        ) : (
                          <Upload size={12} />
                        )}
                        <span className="hidden xl:inline">
                          {uploadBusy ? "Uploading" : "Upload"}
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className="hidden"
                          disabled={uploadBusy}
                          onChange={(event) => {
                            void handleImageUpload(
                              product.id,
                              event.target.files,
                            );
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          toggleProductImages(product.id)
                        }
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-black/8 text-black/42 transition hover:border-[#d71920]/25 hover:bg-[#fff8f8] hover:text-[#d71920]"
                        title={
                          expanded
                            ? "Hide uploaded images"
                            : "Show uploaded images"
                        }
                        aria-label={
                          expanded
                            ? "Hide uploaded images"
                            : "Show uploaded images"
                        }
                        aria-expanded={expanded}
                      >
                        {expanded ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleToggleAvailability(product)
                        }
                        disabled={actionBusy}
                        className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-45 ${
                          product.isAvailable
                            ? "border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
                            : "border-emerald-200 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50"
                        }`}
                        title={
                          product.isAvailable
                            ? "Deactivate product"
                            : "Activate product"
                        }
                        aria-label={
                          product.isAvailable
                            ? "Deactivate product"
                            : "Activate product"
                        }
                      >
                        {actionBusy ? (
                          <RefreshCw
                            size={12}
                            className="animate-spin"
                          />
                        ) : product.isAvailable ? (
                          <Ban size={12} />
                        ) : (
                          <Power size={12} />
                        )}
                      </button>
                    </div>
                  </div>

                  {expanded ? (
                    <div className="border-t border-black/6 bg-[#fafafa] px-4 py-4 lg:px-5">
                      <div className="mb-3 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/35">
                            Uploaded images
                          </p>
                          <p className="mt-0.5 text-[10px] text-black/30">
                            {product.images.length} image
                            {product.images.length === 1 ? "" : "s"} uploaded
                          </p>
                        </div>
                      </div>

                      {product.images.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                          {product.images.map((image) => (
                            <div
                              key={image.id}
                              className="overflow-hidden rounded-xl border border-black/7 bg-white"
                            >
                              <div className="relative aspect-square bg-[#f3f3f0]">
                                {resolveImageUrl(image.imageUrl) ? (
                                  <Image
                                    src={resolveImageUrl(image.imageUrl)}
                                    alt={image.altText || product.name}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="grid h-full place-items-center text-black/20">
                                    <ImageIcon size={18} />
                                  </div>
                                )}
                              </div>
                              <div className="px-2 py-1.5">
                                <p className="truncate text-[8px] font-medium text-black/45">
                                  {image.isPrimary
                                    ? "Primary image"
                                    : "Product image"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-black/10 bg-white px-4 py-6 text-center text-[10px] text-black/30">
                          No images uploaded yet.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {/* PAGINATION */}
        {!loading && pagination.total > 0 ? (
          <div className="flex flex-col gap-3 border-t border-black/7 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between lg:px-5">
            <div className="text-[9px] font-medium text-black/34">
              Page {pagination.page} of {pagination.totalPages}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <label className="flex items-center gap-2 text-[9px] font-medium text-black/35">
                Per page
                <select
                  value={pagination.pageSize}
                  onChange={(event) =>
                    changePageSize(
                      Number(event.target.value),
                    )
                  }
                  className="h-8 rounded-lg border border-black/8 bg-white px-2 text-[9px] font-semibold text-black/55 outline-none focus:border-[#d71920]/35"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>

              <button
                type="button"
                onClick={() =>
                  goToPage(pagination.page - 1)
                }
                disabled={pagination.page <= 1 || loading}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-black/8 px-2.5 text-[9px] font-semibold text-black/45 transition hover:border-[#d71920]/25 hover:text-[#d71920] disabled:cursor-not-allowed disabled:opacity-30"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {buildPaginationItems(
                  pagination.page,
                  pagination.totalPages,
                ).map((item, index) =>
                  item === "ellipsis" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="grid size-8 place-items-center text-[9px] text-black/30"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => goToPage(item)}
                      disabled={loading}
                      className={`grid size-8 place-items-center rounded-lg border text-[9px] font-semibold transition ${
                        pagination.page === item
                          ? "border-[#d71920] bg-[#d71920] text-white shadow-[0_5px_14px_rgba(215,25,32,0.18)]"
                          : "border-black/8 bg-white text-black/45 hover:border-[#d71920]/25 hover:text-[#d71920]"
                      } disabled:cursor-not-allowed disabled:opacity-30`}
                    >
                      {item}
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  goToPage(pagination.page + 1)
                }
                disabled={
                  pagination.page >= pagination.totalPages ||
                  loading
                }
                className="inline-flex h-8 items-center justify-center rounded-lg border border-black/8 px-2.5 text-[9px] font-semibold text-black/45 transition hover:border-[#d71920]/25 hover:text-[#d71920] disabled:cursor-not-allowed disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <div className="mt-4 px-1 text-[9px] text-black/24">
        Click a product name to open its details.
      </div>

      {/* ADD PRODUCT MODAL */}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/35 p-3 backdrop-blur-[3px] sm:p-6"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !saving
            ) {
              closeCreateModal();
            }
          }}
        >
          <div
            ref={modalRef}
            className="w-full max-w-[820px] overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_32px_100px_rgba(0,0,0,0.24)]"
          >
            <div className="relative flex items-center justify-between overflow-hidden border-b border-white/10 bg-[#111111] px-5 py-4 text-white">
              <div className="absolute inset-x-0 top-0 h-[3px] bg-[#d71920]" />

              <div className="pt-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white">
                    Catalog
                  </span>

                  <span className="size-1 rounded-full bg-[#d71920]" />

                  <span className="text-[8px] font-medium uppercase tracking-[0.14em] text-white/45">
                    Product setup
                  </span>
                </div>

                <h2 className="mt-1 text-[19px] font-semibold tracking-[-0.025em] text-white">
                  Add product
                </h2>

                <p className="mt-0.5 text-[10px] text-white/55">
                  Search the global catalog or enter product details manually.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={saving}
                className="grid size-9 place-items-center rounded-xl border border-[#d71920] bg-[#d71920] text-white shadow-[0_6px_18px_rgba(215,25,32,0.25)] transition hover:bg-[#bd151c] hover:border-[#bd151c] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Close"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="max-h-[78vh] overflow-y-auto bg-[#fffdfd] px-5 py-5"
            >
              {error ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[11px] text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2 rounded-2xl bg-[#fffdfd]">
                {/* BARCODE */}

                <div className="md:col-span-2 overflow-hidden rounded-2xl border border-[#d71920]/20 bg-white shadow-[0_10px_30px_rgba(215,25,32,0.07)]">
                  <div className="flex items-center justify-between border-b border-[#d71920]/10 bg-[#fff7f7] px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 place-items-center rounded-lg bg-[#d71920]/10 text-[#d71920]">
                        <Search size={15} strokeWidth={2.3} />
                      </span>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#b9141a]">
                          Global catalog lookup
                        </p>

                        <p className="mt-0.5 text-[9px] text-black/35">
                          Scan a barcode to automatically load product details
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full border border-[#d71920]/15 bg-white px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-[#d71920]">
                      Barcode
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="flex flex-col gap-2.5 sm:flex-row">
                      <div className="relative flex-1">
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute left-3.5 top-1/2 z-10 grid size-6 -translate-y-1/2 place-items-center rounded-md bg-[#fff1f2] text-[#d71920]"
                        >
                          <Search size={13} strokeWidth={2.3} />
                        </span>

                        <input
                          ref={barcodeRef}
                          value={form.barcode}
                          onChange={(event) => {
                            setGlobalProductFound(null);
                            setSuccess("");
                            updateForm(
                              "barcode",
                              event.target.value,
                            );
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter") {
                              return;
                            }

                            event.preventDefault();

                            void (async () => {
                              const result =
                                await lookupGlobalProduct();

                              if (
                                result === "found" ||
                                result === "missing"
                              ) {
                                requestAnimationFrame(() =>
                                  skuRef.current?.focus(),
                                );
                              }
                            })();
                          }}
                          className="admin-product-input h-11 w-full pr-3"
                          style={{ paddingLeft: "3.1rem" }}
                          placeholder="Scan or enter barcode"
                          inputMode="numeric"
                          autoComplete="off"
                          aria-label="Barcode"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void lookupGlobalProduct()
                        }
                        disabled={
                          globalLookupLoading ||
                          !form.barcode.trim()
                        }
                        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d71920] px-5 text-[11px] font-bold text-white shadow-[0_6px_16px_rgba(215,25,32,0.20)] transition hover:bg-[#bd151c] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {globalLookupLoading ? (
                          <RefreshCw
                            size={13}
                            className="animate-spin"
                          />
                        ) : (
                          <Search size={13} />
                        )}

                        {globalLookupLoading
                          ? "Finding..."
                          : "Find product"}
                      </button>
                    </div>

                    {globalProductFound === true ? (
                      <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                        <CircleCheck
                          size={14}
                          className="shrink-0 text-emerald-600"
                        />

                        <p className="text-[9px] font-semibold text-emerald-700">
                          Global product found. Product details have been loaded automatically.
                        </p>
                      </div>
                    ) : globalProductFound === false ? (
                      <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                          !
                        </span>

                        <p className="text-[9px] font-medium text-amber-700">
                          No global product found. Continue entering the product manually.
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 px-1 text-[9px] text-black/30">
                        Scan or enter a barcode, then press Enter to search.
                      </p>
                    )}
                  </div>
                </div>

                {/* SKU */}

                <FormField label="SKU">
                  <input
                    ref={skuRef}
                    value={form.sku}
                    onChange={(event) =>
                      updateForm(
                        "sku",
                        event.target.value,
                      )
                    }
                    onKeyDown={(event) =>
                      focusNextOnEnter(
                        event,
                        nameRef,
                      )
                    }
                    className="admin-product-input"
                    placeholder="e.g. KTL-001"
                  />
                </FormField>

                {/* PRODUCT NAME */}

                <FormField label="Product name *">
                  <input
                    ref={nameRef}
                    value={form.name}
                    onChange={(event) =>
                      updateForm(
                        "name",
                        event.target.value,
                      )
                    }
                    onKeyDown={(event) =>
                      focusNextOnEnter(
                        event,
                        brandRef,
                      )
                    }
                    className="admin-product-input"
                    placeholder="e.g. Stainless Steel Kettle"
                    required
                  />
                </FormField>

                {/* BRAND */}

                <FormField label="Brand">
                  <input
                    ref={brandRef}
                    value={form.brand}
                    onChange={(event) =>
                      updateForm(
                        "brand",
                        event.target.value,
                      )
                    }
                    onKeyDown={(event) =>
                      focusNextOnEnter(
                        event,
                        mainCategoryRef,
                      )
                    }
                    className="admin-product-input"
                    placeholder="e.g. Philips"
                  />
                </FormField>

                {/* MAIN CATEGORY */}

                <FormField label="Main category *">
                  <select
                    ref={mainCategoryRef}
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
                    onKeyDown={(event) => {
                      if (
                        event.key !==
                        "Enter"
                      ) {
                        return;
                      }

                      event.preventDefault();

                      subcategoryRef.current?.focus();
                    }}
                    disabled={
                      loadingCategories
                    }
                    required
                    className="admin-product-input"
                  >
                    <option value="">
                      {loadingCategories
                        ? "Loading categories..."
                        : "Select main category"}
                    </option>

                    {categories
                      .filter(
                        (category) =>
                          category.active !==
                          false,
                      )
                      .map(
                        (
                          category,
                        ) => (
                          <option
                            key={
                              category.id
                            }
                            value={String(
                              category.id,
                            )}
                          >
                            {
                              category.name
                            }
                          </option>
                        ),
                      )}
                  </select>
                </FormField>

                {/* SUBCATEGORY */}

                <FormField label="Subcategory">
                  <select
                    ref={subcategoryRef}
                    value={
                      selectedSubcategory
                    }
                    onChange={(event) =>
                      setSelectedSubcategory(
                        event.target.value,
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key !==
                        "Enter"
                      ) {
                        return;
                      }

                      event.preventDefault();

                      priceRef.current?.focus();
                    }}
                    disabled={
                      !selectedMain
                    }
                    className="admin-product-input"
                  >
                    <option value="">
                      {!selectedMain
                        ? "Select main category first"
                        : (
                            selectedMain.children ??
                            []
                          ).length
                          ? "Use main category"
                          : "No subcategories"}
                    </option>

                    {(
                      selectedMain?.children ??
                      []
                    )
                      .filter(
                        (child) =>
                          child.active !==
                          false,
                      )
                      .map(
                        (
                          child,
                        ) => (
                          <option
                            key={
                              child.id
                            }
                            value={String(
                              child.id,
                            )}
                          >
                            {
                              child.name
                            }
                          </option>
                        ),
                      )}
                  </select>
                </FormField>

                {/* SELLING PRICE */}

                <FormField label="Selling price (LKR) *">
                  <input
                    ref={priceRef}
                    value={form.price}
                    onChange={(event) =>
                      updateForm(
                        "price",
                        event.target.value,
                      )
                    }
                    onKeyDown={(event) =>
                      focusNextOnEnter(
                        event,
                        compareAtPriceRef,
                      )
                    }
                    className="admin-product-input"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="8700"
                    required
                  />
                </FormField>

                {/* COMPARE-AT PRICE */}

                <FormField label="Compare-at price (LKR)">
                  <input
                    ref={
                      compareAtPriceRef
                    }
                    value={
                      form.compareAtPrice
                    }
                    onChange={(event) =>
                      updateForm(
                        "compareAtPrice",
                        event.target.value,
                      )
                    }
                    onKeyDown={(event) =>
                      focusNextOnEnter(
                        event,
                        statusRef,
                      )
                    }
                    className="admin-product-input"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="12500"
                  />
                </FormField>

                {/* STATUS */}

                <FormField label="Status">
                  <select
                    ref={statusRef}
                    value={form.status}
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target.value as ProductStatus,
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key !==
                        "Enter"
                      ) {
                        return;
                      }

                      event.preventDefault();

                      availableRef.current?.focus();
                    }}
                    className="admin-product-input"
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
                </FormField>

                {/* TOGGLES */}

                <div className="grid gap-3 md:grid-cols-2 md:col-span-2">
                  <ToggleField
                    label="Available"
                    type="available"
                    checked={
                      form.isAvailable
                    }
                    inputRef={
                      availableRef
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key !==
                        "Enter"
                      ) {
                        return;
                      }

                      event.preventDefault();

                      updateForm(
                        "isAvailable",
                        !form.isAvailable,
                      );

                      requestAnimationFrame(
                        () =>
                          featuredRef.current?.focus(),
                      );
                    }}
                    onChange={(value) =>
                      updateForm(
                        "isAvailable",
                        value,
                      )
                    }
                  />

                  <ToggleField
                    label="Featured"
                    type="featured"
                    checked={
                      form.isFeatured
                    }
                    inputRef={
                      featuredRef
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key !==
                        "Enter"
                      ) {
                        return;
                      }

                      event.preventDefault();

                      updateForm(
                        "isFeatured",
                        !form.isFeatured,
                      );

                      requestAnimationFrame(
                        () =>
                          shortDescriptionRef.current?.focus(),
                      );
                    }}
                    onChange={(value) =>
                      updateForm(
                        "isFeatured",
                        value,
                      )
                    }
                  />
                </div>

                {/* SHORT DESCRIPTION */}

                <div className="md:col-span-2">
                  <FormField label="Short description">
                    <textarea
                      ref={
                        shortDescriptionRef
                      }
                      value={
                        form.shortDescription
                      }
                      onChange={(event) =>
                        updateForm(
                          "shortDescription",
                          event.target.value,
                        )
                      }
                      className="admin-product-input min-h-20 resize-y py-2.5"
                      placeholder="Short product summary"
                    />
                  </FormField>
                </div>

                {/* DESCRIPTION */}

                <div className="md:col-span-2">
                  <FormField label="Description">
                    <textarea
                      value={
                        form.description
                      }
                      onChange={(event) =>
                        updateForm(
                          "description",
                          event.target.value,
                        )
                      }
                      className="admin-product-input min-h-28 resize-y py-2.5"
                      placeholder="Detailed product information"
                    />
                  </FormField>
                </div>

                {/* IMAGES */}

                <div className="rounded-xl border border-black/7 bg-[#fafafa] p-3.5 md:col-span-2">
  <div className="mb-3 flex items-center justify-between">
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/35">
        Product images
      </p>

      <p className="mt-0.5 text-[10px] text-black/30">
        JPG, PNG or WebP • auto-compressed to under 2 MB • maximum 5
      </p>
    </div>

    <span className="rounded-full border border-black/6 bg-white px-2 py-1 text-[9px] font-semibold text-black/35">
      {selectedImages.length}/5
    </span>
  </div>

  <label className="group flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-black/12 bg-white px-4 py-5 text-center">
    <div>
      <div className="mx-auto mb-1.5 grid size-8 place-items-center rounded-lg bg-black/[0.04] text-black/40">
        <Upload size={15} />
      </div>

      <p className="text-[11px] font-semibold text-black/57">
        Choose product images
      </p>

      <p className="mt-0.5 text-[9px] text-black/28">
        Select multiple files at once
      </p>
    </div>

    <input
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      className="hidden"
      onChange={(event) => {
        void handleImageSelection(event.target.files);
        event.currentTarget.value = "";
      }}
    />
  </label>

  {compressingImages ? (
    <div className="mt-2 rounded-lg border border-[#d71920]/10 bg-[#d71920]/[0.04] px-3 py-2 text-[9px] font-medium text-[#d71920]">
      Optimizing images for upload...
    </div>
  ) : null}

  {selectedImages.length > 0 ? (
  <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
    {selectedImages.map((image, index) => (
      <div
        key={`${image.file.name}-${index}`}
        className="overflow-hidden rounded-xl border border-black/7 bg-white"
      >
        {/* Image preview */}
        <div className="relative aspect-square bg-[#f3f3f0]">
          <Image
            src={image.preview}
            alt={image.file.name}
            fill
            sizes="(max-width: 640px) 50vw, 20vw"
            className="object-contain p-2"
            unoptimized
          />

          {/* Remove image */}
          <button
            type="button"
            onClick={() => {
              URL.revokeObjectURL(image.preview);

              setSelectedImages((current) =>
                current.filter(
                  (_, imageIndex) => imageIndex !== index,
                ),
              );
            }}
            disabled={saving || compressingImages}
            aria-label={`Remove ${image.file.name}`}
            title="Remove image"
            className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-white/95 text-black/55 shadow-sm transition hover:bg-[#d71920] hover:text-white disabled:opacity-40"
          >
            <X size={13} />
          </button>
        </div>

        {/* Filename and file size */}
        <div className="border-t border-black/5 px-2 py-2">
          <p
            className="truncate text-[9px] font-medium text-black/65"
            title={image.file.name}
          >
            {image.file.name}
          </p>

          <p className="mt-1 text-[9px] text-black/35">
            {(image.file.size / (1024 * 1024)).toFixed(2)} MB
          </p>
        </div>
      </div>
    ))}
  </div>
) : null}
</div>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 border-t border-black/7 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    closeCreateModal
                  }
                  disabled={saving}
                  className="h-10 rounded-lg border border-black/8 px-4 text-[11px] font-semibold text-black/52 disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#d71920] px-5 text-[11px] font-semibold text-white disabled:opacity-55"
                >
                  {saving ? (
                    <RefreshCw
                      size={13}
                      className="animate-spin"
                    />
                  ) : (
                    <Check size={13} />
                  )}

                  {saving
                    ? "Saving..."
                    : "Create product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/36">
        {label}
      </span>

      {children}
    </label>
  );
}

function ToggleField({
  label,
  checked,
  inputRef,
  onKeyDown,
  onChange,
  type,
}: {
  label: string;
  checked: boolean;
  inputRef?: Ref<HTMLButtonElement>;
  onKeyDown?: (
    event: KeyboardEvent<HTMLButtonElement>,
  ) => void;
  onChange: (value: boolean) => void;
  type: "available" | "featured";
}) {
  const isAvailable = type === "available";

  const accent = isAvailable
    ? {
        border: "border-emerald-300/70",
        background: "bg-emerald-50",
        iconBg: "bg-emerald-100",
        iconText: "text-emerald-600",
        title: "text-emerald-700",
        switch: "bg-emerald-600",
      }
    : {
        border: "border-[#d71920]/30",
        background: "bg-[#fff5f5]",
        iconBg: "bg-[#fde4e5]",
        iconText: "text-[#d71920]",
        title: "text-[#b9141a]",
        switch: "bg-[#d71920]",
      };

  return (
    <button
      ref={inputRef}
      type="button"
      onClick={() => onChange(!checked)}
      onKeyDown={onKeyDown}
      aria-pressed={checked}
      className={`group flex min-h-[76px] w-full items-center justify-between rounded-xl border px-3.5 text-left transition-all duration-200 ${
        checked
          ? `${accent.border} ${accent.background} shadow-[0_8px_24px_rgba(0,0,0,0.05)]`
          : "border-black/8 bg-white hover:border-black/15 hover:bg-[#fafafa]"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-lg transition ${
            checked
              ? `${accent.iconBg} ${accent.iconText}`
              : "bg-black/[0.045] text-black/35"
          }`}
        >
          {isAvailable ? (
            <CircleCheck size={18} strokeWidth={2.2} />
          ) : (
            <Star
              size={17}
              strokeWidth={2.2}
              fill={checked ? "currentColor" : "none"}
            />
          )}
        </span>

        <div>
          <p
            className={`text-[11px] font-bold transition ${
              checked
                ? accent.title
                : "text-black/62"
            }`}
          >
            {label}
          </p>

          <p
            className={`mt-0.5 text-[9px] transition ${
              checked
                ? "text-black/42"
                : "text-black/30"
            }`}
          >
            {isAvailable
              ? checked
                ? "Customers can purchase this product."
                : "Product is hidden from availability."
              : checked
                ? "Product will be highlighted as featured."
                : "Product will appear as a normal item."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <span
          className={`hidden rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] sm:inline-flex ${
            checked
              ? `${accent.iconBg} ${accent.title}`
              : "bg-black/[0.045] text-black/30"
          }`}
        >
          {checked ? "ON" : "OFF"}
        </span>

        <span
          className={`relative flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${
            checked
              ? accent.switch
              : "bg-black/12"
          }`}
        >
          <span
            className={`grid size-5 place-items-center rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.16)] transition-transform duration-200 ${
              checked
                ? "translate-x-5"
                : "translate-x-0"
            }`}
          >
            {checked ? (
              <Check
                size={11}
                strokeWidth={3}
                className={
                  isAvailable
                    ? "text-emerald-600"
                    : "text-[#d71920]"
                }
              />
            ) : (
              <X
                size={10}
                strokeWidth={2.5}
                className="text-black/30"
              />
            )}
          </span>
        </span>
      </div>
    </button>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?:
    | "neutral"
    | "green"
    | "amber"
    | "red"
    | "dark";
}) {
  const valueClass = {
    neutral: "text-black/84",
    green:
      "text-[var(--admin-green)]",
    amber:
      "text-amber-600",
    red: "text-red-600",
    dark: "text-black",
  }[tone];

  return (
    <div className="products-stat rounded-xl border border-black/7 bg-white px-3.5 py-3 shadow-sm">
      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/28">
        {label}
      </p>

      <p
        className={`mt-1.5 text-[21px] font-semibold tracking-[-0.045em] ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}