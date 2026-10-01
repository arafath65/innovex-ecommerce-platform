"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Ban,
    Check,
    ChevronDown,
    ChevronUp,
    Image as ImageIcon,
    Plus,
    Power,
    RefreshCw,
    Search,
    Upload,
    X,
} from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { FormEvent, useEffect, useMemo, useRef, useState, } from "react";
/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */
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
/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */
function formatPrice(value: string | number | null) {
    if (value === null ||
        value === "") {
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
function resolveImageUrl(value: string | null | undefined) {
    if (!value)
        return "";
    let url = value.trim().replace(/\\/g, "/");
    if (!url)
        return "";
    if (/^https?:\/\//i.test(url) ||
        url.startsWith("data:") ||
        url.startsWith("blob:")) {
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
function getPrimaryImage(product: Product) {
    const image = product.images.find((item) => item.isPrimary) ??
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

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */
export default function ProductsList() {
    const rootRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [products, setProducts,] = useState<Product[]>([]);
    const [categories, setCategories,] = useState<Category[]>([]);
    const [loading, setLoading,] = useState(true);
    const [loadingCategories, setLoadingCategories,] = useState(true);
    const [search, setSearch,] = useState("");
    const [statusFilter, setStatusFilter,] = useState("");
    const [availabilityFilter, setAvailabilityFilter,] = useState("");
    const [featuredFilter, setFeaturedFilter,] = useState("");
    const [uploadingProductId, setUploadingProductId,] = useState<number | null>(null);
    const [actionProductId, setActionProductId,] = useState<number | null>(null);
    const [expandedProductIds, setExpandedProductIds,] = useState<Set<number>>(new Set());
    const [editingProduct, setEditingProduct,] = useState<Product | null>(null);
    const [modalOpen, setModalOpen,] = useState(false);
    const [saving, setSaving,] = useState(false);
    const [error, setError,] = useState("");
    const [success, setSuccess,] = useState("");
    const [form, setForm,] = useState<ProductForm>(EMPTY_FORM);
    const [selectedMainCategory, setSelectedMainCategory,] = useState("");
    const [selectedSubcategory, setSelectedSubcategory,] = useState("");
    const [selectedImages, setSelectedImages,] = useState<SelectedImage[]>([]);
    useGSAP(() => {
        const timeline = gsap.timeline({
            defaults: {
                ease: "power3.out",
            },
        });
        timeline
            .from(".products-header", {
            opacity: 0,
            y: 14,
            duration: 0.65,
        })
            .from(".products-stat", {
            opacity: 0,
            y: 10,
            duration: 0.42,
            stagger: 0.08,
        }, "-=0.25")
            .from(".products-toolbar", {
            opacity: 0,
            y: 8,
            duration: 0.42,
        }, "-=0.20")
            .from(".products-table", {
            opacity: 0,
            y: 10,
            duration: 0.50,
        }, "-=0.18")
            .from(".product-row", {
            opacity: 0,
            y: 7,
            duration: 0.35,
            stagger: 0.08,
        }, "-=0.25");
    }, {
        scope: rootRef,
    });
    /* ------------------------------------------------------------------------ */
    /* INITIAL DATA LOAD                                                       */
    /* ------------------------------------------------------------------------ */
    useEffect(() => {
        let cancelled = false;
        async function loadInitialData() {
            try {
                setError("");
                const [categoriesResponse, productsResponse,] = await Promise.all([
                    fetch("/api/admin/categories", {
                        cache: "no-store",
                    }),
                    fetch("/api/admin/products", {
                        cache: "no-store",
                    }),
                ]);
                if (categoriesResponse.status ===
                    401 ||
                    productsResponse.status ===
                        401) {
                    router.push("/admin/login");
                    return;
                }
                const categoriesData = await categoriesResponse.json();
                const productsData = await productsResponse.json();
                if (!categoriesResponse.ok) {
                    throw new Error(categoriesData.error ||
                        "Failed to load categories.");
                }
                if (!productsResponse.ok) {
                    throw new Error(productsData.error ||
                        productsData.message ||
                        "Failed to load products.");
                }
                if (cancelled) {
                    return;
                }
                setCategories(Array.isArray(categoriesData.categories)
                    ? categoriesData.categories
                    : []);
                setProducts(Array.isArray(productsData.products)
                    ? productsData.products
                    : []);
            }
            catch (loadError) {
                if (!cancelled) {
                    setError(loadError instanceof
                        Error
                        ? loadError.message
                        : "Failed to load products.");
                }
            }
            finally {
                if (!cancelled) {
                    setLoading(false);
                    setLoadingCategories(false);
                }
            }
        }
        void loadInitialData();
        return () => {
            cancelled = true;
        };
    }, [router]);
    /* ------------------------------------------------------------------------ */
    /* REFRESH                                                                  */
    /* ------------------------------------------------------------------------ */
    async function refreshProducts() {
        setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/admin/products", {
                cache: "no-store",
            });
            if (response.status === 401) {
                router.push("/admin/login");
                return;
            }
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error ||
                    data.message ||
                    "Failed to refresh products.");
            }
            setProducts(Array.isArray(data.products)
                ? data.products
                : []);
        }
        catch (refreshError) {
            setError(refreshError instanceof
                Error
                ? refreshError.message
                : "Failed to refresh products.");
        }
        finally {
            setLoading(false);
        }
    }
    /* ------------------------------------------------------------------------ */
    /* FILTERED PRODUCTS                                                       */
    /* ------------------------------------------------------------------------ */
    const filteredProducts = useMemo(() => {
        const query = search
            .trim()
            .toLowerCase();
        return products.filter((product) => {
            if (query &&
                !product.name
                    .toLowerCase()
                    .includes(query) &&
                !product.slug
                    .toLowerCase()
                    .includes(query) &&
                !(product.sku ?? "")
                    .toLowerCase()
                    .includes(query)) {
                return false;
            }
            if (statusFilter &&
                product.status !==
                    statusFilter) {
                return false;
            }
            if (availabilityFilter ===
                "available" &&
                !product.isAvailable) {
                return false;
            }
            if (availabilityFilter ===
                "unavailable" &&
                product.isAvailable) {
                return false;
            }
            if (featuredFilter ===
                "featured" &&
                !product.isFeatured) {
                return false;
            }
            if (featuredFilter ===
                "not-featured" &&
                product.isFeatured) {
                return false;
            }
            return true;
        });
    }, [
        products,
        search,
        statusFilter,
        availabilityFilter,
        featuredFilter,
    ]);
    /* ------------------------------------------------------------------------ */
    /* STATS                                                                    */
    /* ------------------------------------------------------------------------ */
    const stats = useMemo(() => ({
        total: products.length,
        published: products.filter((product) => product.status ===
            "PUBLISHED").length,
        draft: products.filter((product) => product.status ===
            "DRAFT").length,
        unavailable: products.filter((product) => !product.isAvailable).length,
        featured: products.filter((product) => product.isFeatured).length,
    }), [products]);
    /* ------------------------------------------------------------------------ */
    /* FORM                                                                     */
    /* ------------------------------------------------------------------------ */
    const selectedMain = categories.find((category) => String(category.id) ===
        selectedMainCategory);
    function resetForm() {
        selectedImages.forEach((image) => {
            URL.revokeObjectURL(image.preview);
        });
        setForm(EMPTY_FORM);
        setSelectedMainCategory("");
        setSelectedSubcategory("");
        setSelectedImages([]);
    }
    function openCreateModal() {
        resetForm();
        setEditingProduct(null);
        setError("");
        setSuccess("");
        setModalOpen(true);
        requestAnimationFrame(() => {
            if (!modalRef.current) {
                return;
            }
            gsap.fromTo(modalRef.current, {
                opacity: 0,
                y: 18,
                scale: 0.985,
            }, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.42,
                ease: "power3.out",
            });
        });
    }
    function closeCreateModal() {
        if (saving) {
            return;
        }

        const finishClose = () => {
            resetForm();
            setEditingProduct(null);
            setModalOpen(false);
        };

        if (modalRef.current) {
            gsap.to(modalRef.current, {
                opacity: 0,
                y: 10,
                scale: 0.99,
                duration: 0.22,
                ease: "power2.in",
                onComplete: finishClose,
            });
        } else {
            finishClose();
        }
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
                        price: product.price == null ? null : Number(product.price),
                        compareAtPrice:
                            product.compareAtPrice == null
                                ? null
                                : Number(product.compareAtPrice),
                        shortDescription: product.shortDescription,
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
                        `Failed to ${nextAvailable ? "activate" : "deactivate"} product.`,
                );
            }

            setSuccess(
                nextAvailable
                    ? "Product activated successfully."
                    : "Product deactivated successfully.",
            );

            await refreshProducts();
        } catch (toggleError) {
            setError(
                toggleError instanceof Error
                    ? toggleError.message
                    : "Failed to update product availability.",
            );
        } finally {
            setActionProductId(null);
        }
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

    function updateForm<K extends keyof ProductForm>(field: K, value: ProductForm[K]) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    }
    function handleImageSelection(files: FileList | null) {
        if (!files) {
            return;
        }
        const nextFiles = Array.from(files);
        if (selectedImages.length +
            nextFiles.length >
            5) {
            setError("You can select a maximum of 5 images.");
            return;
        }
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];
        const invalidFile = nextFiles.find((file) => !allowedTypes.includes(file.type));
        if (invalidFile) {
            setError(`${invalidFile.name} is not supported. Use JPG, PNG or WebP.`);
            return;
        }
        const oversizedFile = nextFiles.find((file) => file.size >
            5 * 1024 * 1024);
        if (oversizedFile) {
            setError(`${oversizedFile.name} is larger than 5 MB.`);
            return;
        }
        const preparedImages = nextFiles.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
        }));
        setError("");
        setSelectedImages((current) => [
            ...current,
            ...preparedImages,
        ]);
    }
    function removeSelectedImage(index: number) {
        setSelectedImages((current) => {
            const item = current[index];
            if (item) {
                URL.revokeObjectURL(item.preview);
            }
            return current.filter((_, itemIndex) => itemIndex !== index);
        });
    }
    async function uploadImages(productId: number, files: File[]) {
        if (files.length === 0) {
            return;
        }
        setUploadingProductId(productId);
        try {
            const formData = new FormData();
            files.forEach((file) => {
                formData.append("images", file);
            });
            const response = await fetch(`/api/admin/products/${productId}/images`, {
                method: "POST",
                body: formData,
            });
            if (response.status === 401) {
                router.push("/admin/login");
                return;
            }
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error ||
                    data.message ||
                    "Failed to upload product images.");
            }
        }
        finally {
            setUploadingProductId(null);
        }
    }
    async function handleImageUpload(productId: number, files: FileList | null) {
        if (!files || files.length === 0) {
            return;
        }
        const selectedFiles = Array.from(files);
        const validationError = handleImageUploadValidation(selectedFiles);
        if (validationError) {
            setError(validationError);
            return;
        }
        setError("");
        setSuccess("");
        try {
            await uploadImages(productId, selectedFiles);
            setSuccess("Product images uploaded successfully.");
            await refreshProducts();
        }
        catch (uploadError) {
            setError(uploadError instanceof Error
                ? uploadError.message
                : "Failed to upload product images.");
        }
    }
    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (saving) {
            return;
        }

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const name = form.name.trim();

            if (!name) {
                throw new Error("Product name is required.");
            }

            const price = Number(form.price);

            if (!form.price.trim() || !Number.isFinite(price) || price < 0) {
                throw new Error("Please enter a valid selling price.");
            }

            if (!selectedMainCategory) {
                throw new Error("Please select a main category.");
            }

            const categoryId = selectedSubcategory
                ? Number(selectedSubcategory)
                : Number(selectedMainCategory);

            const compareAtPrice = form.compareAtPrice.trim()
                ? Number(form.compareAtPrice)
                : null;

            if (
                compareAtPrice !== null &&
                (!Number.isFinite(compareAtPrice) || compareAtPrice < 0)
            ) {
                throw new Error("Please enter a valid compare-at price.");
            }

            const endpoint = editingProduct
                ? `/api/admin/products/${editingProduct.id}`
                : "/api/admin/products";

            const response = await fetch(endpoint, {
                method: editingProduct ? "PATCH" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name,
                    sku: form.sku.trim() || null,
                    price,
                    compareAtPrice,
                    shortDescription: form.shortDescription.trim() || null,
                    description: form.description.trim() || null,
                    status: form.status,
                    isAvailable: form.isAvailable,
                    isFeatured: form.isFeatured,
                    categoryId,
                }),
            });

            if (response.status === 401) {
                router.push("/admin/login");
                return;
            }

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                        `Failed to ${editingProduct ? "update" : "create"} product.`,
                );
            }

            const savedProductId = Number(
                data.product?.id ?? data.id ?? editingProduct?.id,
            );

            if (selectedImages.length > 0) {
                if (!Number.isInteger(savedProductId) || savedProductId <= 0) {
                    throw new Error(
                        "Product was saved, but its ID was not returned, so images could not be uploaded.",
                    );
                }

                await uploadImages(
                    savedProductId,
                    selectedImages.map((image) => image.file),
                );
            }

            selectedImages.forEach((image) => {
                URL.revokeObjectURL(image.preview);
            });

            setSelectedImages([]);
            setForm(EMPTY_FORM);
            setSelectedMainCategory("");
            setSelectedSubcategory("");
            setEditingProduct(null);
            setModalOpen(false);

            setSuccess(
                editingProduct
                    ? "Product updated successfully."
                    : "Product created successfully.",
            );

            await refreshProducts();
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : `Failed to ${editingProduct ? "update" : "create"} product.`,
            );
        } finally {
            setSaving(false);
        }
    }
    /* ------------------------------------------------------------------------ */
    /* FILTER RESET                                                             */
    /* ------------------------------------------------------------------------ */
    function clearFilters() {
        setSearch("");
        setStatusFilter("");
        setAvailabilityFilter("");
        setFeaturedFilter("");
    }
    const activeFilters = Boolean(search ||
        statusFilter ||
        availabilityFilter ||
        featuredFilter);
    /* ------------------------------------------------------------------------ */
    /* RENDER                                                                   */
    /* ------------------------------------------------------------------------ */
    return (<div ref={rootRef} className="mx-auto w-full max-w-[1480px]">

      {/* HEADER */}

      <div className="products-header mb-5 flex flex-col gap-4 border-b border-black/7 pb-5 sm:flex-row sm:items-end sm:justify-between">

        <div>

          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/35">

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

            Manage your Oscar Trading

            catalog, pricing and images.

          </p>

        </div>


        <button type="button" onClick={openCreateModal} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#d71920] px-4 text-[12px] font-semibold text-white shadow-[0_10px_22px_rgba(215,25,32,0.16)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#c5151c]">

          <Plus size={15}/>

          Add product

        </button>

      </div>


      {/* FEEDBACK */}

      {error ? (<div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[11px] text-red-700">

          <span>{error}</span>


          <button type="button" onClick={() => setError("")} className="rounded-md p-1 hover:bg-red-100" aria-label="Dismiss error">

            <X size={14}/>

          </button>

        </div>) : null}


      {success ? (<div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[11px] text-emerald-700">

          <span className="flex items-center gap-2">

            <Check size={14}/>

            {success}

          </span>


          <button type="button" onClick={() => setSuccess("")} className="rounded-md p-1 hover:bg-emerald-100" aria-label="Dismiss success">

            <X size={14}/>

          </button>

        </div>) : null}


      {/* STATS */}

      <div className="mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-5">

        <StatCard label="Total" value={stats.total}/>


        <StatCard label="Published" value={stats.published} tone="green"/>


        <StatCard label="Draft" value={stats.draft} tone="amber"/>


        <StatCard label="Unavailable" value={stats.unavailable} tone="red"/>


        <StatCard label="Featured" value={stats.featured} tone="dark"/>

      </div>


      {/* FILTERS */}

      <section className="products-toolbar mb-4 rounded-xl border border-black/7 bg-white p-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.035)]">

        <div className="grid gap-2.5 lg:grid-cols-[minmax(240px,1.7fr)_165px_170px_150px_auto]">

          <label className="relative block">

            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/28"/>


            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, SKU or slug..." className="h-10 w-full rounded-lg border border-black/8 bg-[#fafafa] pl-9 pr-3 text-[12px] text-black/75 outline-none transition placeholder:text-black/27 focus:border-[var(--admin-green)] focus:bg-white"/>

          </label>


          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-lg border border-black/8 bg-[#fafafa] px-3 text-[11px] text-black/55 outline-none focus:border-[var(--admin-green)]">

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


          <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)} className="h-10 rounded-lg border border-black/8 bg-[#fafafa] px-3 text-[11px] text-black/55 outline-none focus:border-[var(--admin-green)]">

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


          <select value={featuredFilter} onChange={(event) => setFeaturedFilter(event.target.value)} className="h-10 rounded-lg border border-black/8 bg-[#fafafa] px-3 text-[11px] text-black/55 outline-none focus:border-[var(--admin-green)]">

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


          <button type="button" onClick={() => {
            if (activeFilters) {
                clearFilters();
                return;
            }
            void refreshProducts();
        }} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-black/8 bg-white px-3 text-[11px] font-semibold text-black/50 transition hover:border-black/15 hover:text-black">

            {activeFilters ? (<X size={14}/>) : (<RefreshCw size={14} className={loading
                ? "animate-spin"
                : ""}/>)}


            {activeFilters
            ? "Clear"
            : "Refresh"}

          </button>

        </div>

      </section>


      {/* TABLE */}

      <section className="products-table overflow-hidden rounded-xl border border-black/7 bg-white shadow-[0_12px_38px_rgba(0,0,0,0.04)]">

        <div className="flex items-center justify-between border-b border-black/7 px-4 py-3.5 sm:px-5">

          <div>

            <h2 className="text-[13px] font-semibold text-black/84">

              Catalog

            </h2>


            <p className="mt-0.5 text-[10px] text-black/33">

              {filteredProducts.length}{" "}

              product

              {filteredProducts.length ===
            1
            ? ""
            : "s"} shown

            </p>

          </div>


          <button type="button" onClick={() => void refreshProducts()} className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-black/32 transition hover:text-[var(--admin-green)]">

            <RefreshCw size={12} className={loading
            ? "animate-spin"
            : ""}/>


            Refresh

          </button>

        </div>


        <div className="hidden grid-cols-[minmax(270px,1.65fr)_125px_120px_100px_110px_250px] gap-4 border-b border-black/6 bg-[#fafafa] px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-black/29 lg:grid lg:px-5">

          <span>Product</span>

          <span>Category</span>

          <span>Price</span>

          <span>Status</span>

          <span>Availability</span>

          <span>Actions</span>

        </div>


        {loading ? (<div className="px-5 py-14 text-center text-[11px] text-black/34">

            Loading products...

          </div>) : filteredProducts.length ===
            0 ? (<div className="px-5 py-14 text-center">

            <div className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-black/[0.035] text-black/23">

              <ImageIcon size={18}/>

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


            {!activeFilters ? (<button type="button" onClick={openCreateModal} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#d71920] px-3.5 py-2 text-[10px] font-semibold text-white">

                <Plus size={13}/>

                Add first product

              </button>) : null}

          </div>) : (<div className="divide-y divide-black/6">

            {filteredProducts.map((product) => {
                const primary = getPrimaryImage(product);
                return (<div key={product.id}>

                  <div className="product-row grid gap-3 px-3.5 py-3.5 transition hover:bg-[#fcfcfb] lg:grid-cols-[minmax(270px,1.65fr)_125px_120px_100px_110px_250px] lg:items-center lg:gap-4 lg:px-5">

                    {/* PRODUCT */}

                    <div className="flex min-w-0 items-center gap-3">

                      <div className="grid size-[56px] shrink-0 place-items-center overflow-hidden rounded-xl border border-black/7 bg-[#f6f6f3]">

                        {primary ? (<Image src={primary} alt={product.name} width={56} height={56} className="h-full w-full object-cover" unoptimized/>) : (<ImageIcon size={18} className="text-black/18"/>)}

                      </div>


                      <div className="min-w-0">

                        <Link href={`/admin/products/${product.id}`} className="group inline-flex max-w-full items-center gap-1.5">

                          <span className="truncate text-[12px] font-semibold text-black/80 transition group-hover:text-[#d71920]">

                            {product.name}

                          </span>


                          <span className="text-[11px] text-black/18 transition group-hover:translate-x-0.5 group-hover:text-[#d71920]">

                            →

                          </span>

                        </Link>


                        <p className="mt-0.5 truncate text-[9px] text-black/29">

                          {product.sku ||
                        product.slug}

                        </p>


                        <div className="mt-1 flex items-center gap-2 text-[9px] text-black/25">

                          <span>

                            {product
                        .images
                        .length}{" "}

                            image

                            {product
                        .images
                        .length ===
                        1
                        ? ""
                        : "s"}

                          </span>


                          {product.isFeatured ? (<>

                              <span>

                                •

                              </span>


                              <span className="text-amber-500">

                                Featured

                              </span>

                            </>) : null}

                        </div>

                      </div>

                    </div>


                    {/* CATEGORY */}

                    <div className="hidden min-w-0 lg:block">

                      <span className="truncate text-[10px] font-medium text-black/51">

                        {product
                        .category
                        ?.name ||
                        "Uncategorized"}

                      </span>

                    </div>


                    {/* PRICE */}

                    <div>

                      <p className="text-[11px] font-semibold text-black/76">

                        {formatPrice(product.price)}

                      </p>


                      {product.compareAtPrice !==
                        null ? (<p className="mt-0.5 text-[9px] text-black/22 line-through">

                          {formatPrice(product.compareAtPrice)}

                        </p>) : null}

                    </div>


                    {/* STATUS */}

                    <div>

                      <span className={`inline-flex rounded-full border px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.07em] ${statusClasses(product.status)}`}>

                        {product.status}

                      </span>

                    </div>


                    {/* AVAILABILITY */}

                    <div className="text-[9px] font-semibold">

                      <span className={product.isAvailable
                        ? "text-emerald-600"
                        : "text-red-600"}>

                        {product.isAvailable
                        ? "● Available"
                        : "● Unavailable"}

                      </span>

                    </div>


                    {/* ACTIONS */}

                    <div className="flex flex-nowrap items-center gap-2">

                      <label
                        className={`inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-black/8 px-2.5 text-[9px] font-semibold text-black/48 transition hover:border-black/15 hover:text-black ${
                          uploadingProductId === product.id
                            ? "pointer-events-none opacity-45"
                            : ""
                        }`}
                        title="Upload images"
                      >
                        {uploadingProductId === product.id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <Upload size={12} />
                        )}

                        <span>
                          {uploadingProductId === product.id
                            ? "Uploading"
                            : "Upload"}
                        </span>

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className="hidden"
                          disabled={uploadingProductId === product.id}
                          onChange={(event) => {
                            const files = event.target.files;
                            void handleImageUpload(product.id, files);
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => toggleProductImages(product.id)}
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-black/8 text-black/42 transition hover:border-black/15 hover:text-black"
                        title={
                          expandedProductIds.has(product.id)
                            ? "Hide uploaded images"
                            : "Show uploaded images"
                        }
                        aria-expanded={expandedProductIds.has(product.id)}
                        aria-label={
                          expandedProductIds.has(product.id)
                            ? "Hide uploaded images"
                            : "Show uploaded images"
                        }
                      >
                        {expandedProductIds.has(product.id) ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleToggleAvailability(product)}
                        disabled={actionProductId === product.id}
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
                        {actionProductId === product.id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : product.isAvailable ? (
                          <Ban size={12} />
                        ) : (
                          <Power size={12} />
                        )}
                      </button>

                    </div>

                  </div>

                  {expandedProductIds.has(product.id) ? (
                    <div className="border-t border-black/6 bg-[#fafafa] px-4 py-4 lg:px-5">
                      <div className="mb-3">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/35">
                          Uploaded images
                        </p>
                        <p className="mt-0.5 text-[10px] text-black/30">
                          {product.images.length} image{product.images.length === 1 ? "" : "s"} uploaded
                        </p>
                      </div>

                      {product.images.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                          {product.images.map((image) => (
                            <div key={image.id} className="overflow-hidden rounded-xl border border-black/7 bg-white">
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
                                  {image.isPrimary ? "Primary image" : "Product image"}
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

                </div>);
            })}

          </div>)}

      </section>


      <div className="mt-4 px-1 text-[9px] text-black/24">

        Click a product name to

        open its details.

      </div>


      {/* -------------------------------------------------------------------- */}

      {/* CREATE PRODUCT MODAL                                                 */}

      {/* -------------------------------------------------------------------- */}


      {modalOpen ? (<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/35 p-3 backdrop-blur-[3px] sm:p-6" onMouseDown={(event) => {
                if (event.target ===
                    event.currentTarget &&
                    !saving) {
                    closeCreateModal();
                }
            }}>

          <div ref={modalRef} className="w-full max-w-[820px] overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_32px_100px_rgba(0,0,0,0.24)]">

            <div className="flex items-center justify-between border-b border-black/7 px-5 py-4">

              <div>

                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-green)]">

                  Catalog

                </div>


                <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.03em] text-black">

                  {editingProduct ? "Edit product" : "Add product"}

                </h2>


                <p className="mt-0.5 text-[10px] text-black/34">

                  {editingProduct
                    ? "Update product details and save your changes."
                    : "Create the product and add its catalog information."}

                </p>

              </div>


              <button type="button" onClick={closeCreateModal} disabled={saving} className="grid size-8 place-items-center rounded-lg border border-black/7 text-black/38 transition hover:text-black disabled:opacity-40" aria-label="Close">

                <X size={15}/>

              </button>

            </div>


            <form onSubmit={handleSubmit} className="max-h-[78vh] overflow-y-auto px-5 py-5">

              {error ? (<div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[11px] text-red-700">

                  {error}

                </div>) : null}


              <div className="grid gap-4 md:grid-cols-2">

                <FormField label="Product name *">

                  <input value={form.name} onChange={(event) => updateForm("name", event.target
                .value)} className="admin-product-input" placeholder="e.g. Stainless Steel Kettle" required/>

                </FormField>


                <FormField label="SKU">

                  <input value={form.sku} onChange={(event) => updateForm("sku", event.target
                .value)} className="admin-product-input" placeholder="e.g. KTL-001"/>

                </FormField>


                <FormField label="Main category *">

                  <select value={selectedMainCategory} onChange={(event) => {
                setSelectedMainCategory(event.target
                    .value);
                setSelectedSubcategory("");
            }} disabled={loadingCategories} required className="admin-product-input">

                    <option value="">

                      {loadingCategories
                ? "Loading categories..."
                : "Select main category"}

                    </option>


                    {categories
                .filter((category) => category.active !==
                false)
                .map((category) => (<option key={category.id} value={String(category.id)}>

                            {category.name}

                          </option>))}

                  </select>

                </FormField>


                <FormField label="Subcategory">

                  <select value={selectedSubcategory} onChange={(event) => setSelectedSubcategory(event.target
                .value)} disabled={!selectedMain} className="admin-product-input">

                    <option value="">

                      {!selectedMain
                ? "Select main category first"
                : (selectedMain.children ??
                    [])
                    .length >
                    0
                    ? "Use main category"
                    : "No subcategories"}

                    </option>


                    {(selectedMain?.children ??
                [])
                .filter((child) => child.active !==
                false)
                .map((child) => (<option key={child.id} value={String(child.id)}>

                            {child.name}

                          </option>))}

                  </select>

                </FormField>


                <FormField label="Selling price (LKR) *">

                  <input value={form.price} onChange={(event) => updateForm("price", event.target
                .value)} className="admin-product-input" type="number" min="0" step="0.01" inputMode="decimal" placeholder="8700" required/>

                </FormField>


                <FormField label="Compare-at price (LKR)">

                  <input value={form.compareAtPrice} onChange={(event) => updateForm("compareAtPrice", event.target
                .value)} className="admin-product-input" type="number" min="0" step="0.01" inputMode="decimal" placeholder="12500"/>

                </FormField>


                <FormField label="Status">

                  <select value={form.status} onChange={(event) => updateForm("status", event.target
                .value as ProductStatus)} className="admin-product-input">

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


                <div className="grid grid-cols-2 gap-2">

                  <ToggleField label="Available" checked={form.isAvailable} onChange={(value) => updateForm("isAvailable", value)}/>


                  <ToggleField label="Featured" checked={form.isFeatured} onChange={(value) => updateForm("isFeatured", value)}/>

                </div>


                <div className="md:col-span-2">

                  <FormField label="Short description">

                    <input value={form.shortDescription} onChange={(event) => updateForm("shortDescription", event.target
                .value)} className="admin-product-input" placeholder="Short summary for the product card"/>

                  </FormField>

                </div>


                <div className="md:col-span-2">

                  <FormField label="Description">

                    <textarea value={form.description} onChange={(event) => updateForm("description", event.target
                .value)} className="admin-product-input min-h-28 resize-y py-2.5" placeholder="Detailed product information"/>

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

                        JPG, PNG or WebP •

                        5 MB each •

                        maximum 5

                      </p>

                    </div>


                    <span className="rounded-full border border-black/6 bg-white px-2 py-1 text-[9px] font-semibold text-black/35">

                      {selectedImages.length}

                      /5

                    </span>

                  </div>


                  <label className="group flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-black/12 bg-white px-4 py-5 text-center transition hover:border-[var(--admin-green)] hover:bg-[var(--admin-green-soft)]">

                    <div>

                      <div className="mx-auto mb-1.5 grid size-8 place-items-center rounded-lg bg-black/[0.04] text-black/40 transition group-hover:bg-white group-hover:text-[var(--admin-green)]">

                        <Upload size={15}/>

                      </div>


                      <p className="text-[11px] font-semibold text-black/57">

                        Choose product

                        images

                      </p>


                      <p className="mt-0.5 text-[9px] text-black/28">

                        Select multiple

                        files at once

                      </p>

                    </div>


                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(event) => {
                handleImageSelection(event
                    .target
                    .files);
                event.currentTarget.value =
                    "";
            }}/>

                  </label>


                  {selectedImages.length >
                0 ? (<div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">

                      {selectedImages.map((image, index) => (<div key={`${image.file.name}-${index}`} className="overflow-hidden rounded-xl border border-black/7 bg-white">

                            <div className="relative aspect-square bg-[#f3f3f0]">

                              <Image src={image.preview} alt={image.file
                        .name} width={180} height={180} className="h-full w-full object-cover" unoptimized/>


                              <button type="button" onClick={() => removeSelectedImage(index)} disabled={saving} className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-white/95 text-black/50 shadow-sm transition hover:bg-red-600 hover:text-white disabled:opacity-40" aria-label="Remove image">

                                <X size={12}/>

                              </button>

                            </div>


                            <div className="px-2 py-1.5">

                              <p className="truncate text-[8px] text-black/34">

                                {image.file
                        .name}

                              </p>

                            </div>

                          </div>))}

                    </div>) : null}

                </div>

              </div>


              <div className="mt-5 flex flex-col-reverse gap-2 border-t border-black/7 pt-4 sm:flex-row sm:justify-end">

                <button type="button" onClick={closeCreateModal} disabled={saving} className="h-10 rounded-lg border border-black/8 px-4 text-[11px] font-semibold text-black/52 transition hover:bg-black/[0.025] disabled:opacity-40">

                  Cancel

                </button>


                <button type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#d71920] px-5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#c5151c] disabled:cursor-not-allowed disabled:opacity-55">

                  {saving ? (<RefreshCw size={13} className="animate-spin"/>) : (<Check size={13}/>)}


                  {saving
                ? editingProduct
                  ? "Updating..."
                  : "Saving..."
                : editingProduct
                  ? "Update product"
                  : "Create product"}

                </button>

              </div>

            </form>

          </div>

        </div>) : null}

    </div>);
}
/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */
function handleImageUploadValidation(files: File[]) {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];
    const invalidFile = files.find((file) => !allowedTypes.includes(file.type));
    if (invalidFile) {
        return `${invalidFile.name} is not supported. Use JPG, PNG or WebP.`;
    }
    const oversizedFile = files.find((file) => file.size >
        5 * 1024 * 1024);
    if (oversizedFile) {
        return `${oversizedFile.name} is larger than 5 MB.`;
    }
    return "";
}
function FormField({ label, children, }: {
    label: string;
    children: React.ReactNode;
}) {
    return (<label className="block">

      <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.13em] text-black/36">

        {label}

      </span>


      {children}

    </label>);
}
function ToggleField({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            aria-pressed={checked}
            className={`flex h-11 items-center justify-between rounded-xl border px-3 transition ${
                checked
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-black/8 bg-white hover:border-black/14"
            }`}
        >
            <span>
                <span className="block text-[10px] font-semibold text-black/65">
                    {label}
                </span>
                <span className="mt-0.5 block text-[9px] text-black/34">
                    {checked ? "On" : "Off"}
                </span>
            </span>

            <span
                className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                    checked ? "bg-[var(--admin-green)]" : "bg-black/12"
                }`}
            >
                <span
                    className={`absolute top-1 size-3 rounded-full bg-white shadow-sm transition ${
                        checked ? "left-5" : "left-1"
                    }`}
                />
            </span>
        </button>
    );
}
function StatCard({ label, value, tone = "neutral", }: {
    label: string;
    value: number;
    tone?: "neutral" | "green" | "amber" | "red" | "dark";
}) {
    const valueClass = {
        neutral: "text-black/84",
        green: "text-[var(--admin-green)]",
        amber: "text-amber-600",
        red: "text-red-600",
        dark: "text-black",
    }[tone];
    return (<div className="products-stat rounded-xl border border-black/7 bg-white px-3.5 py-3 shadow-[0_7px_22px_rgba(0,0,0,0.025)]">

      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/28">

        {label}

      </p>


      <p className={`mt-1.5 text-[21px] font-semibold tracking-[-0.045em] ${valueClass}`}>

        {value}

      </p>

    </div>);
}
