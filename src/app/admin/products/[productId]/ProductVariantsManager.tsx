"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

type AttributeType =
  | "TEXT"
  | "NUMBER"
  | "BOOLEAN"
  | "SELECT"
  | "MULTI_SELECT";

type OptionDraft = {
  name: string;
  valuesText: string;
};

type VariantImage = {
  id: number;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

type Variant = {
  id: number | null;
  title: string;
  sku: string;
  barcode: string;
  price: string;
  compareAtPrice: string;
  stockQuantity: string;
  trackInventory: boolean;
  lowStockThreshold: string;
  imageUrl: string;
  images: VariantImage[];
  isDefault: boolean;
  isAvailable: boolean;
  selections: Record<string, string>;
  hasOrderHistory: boolean;
  orderItemCount: number;
};

type Attribute = {
  id?: number;
  name: string;
  label: string;
  type: AttributeType;
  optionsText: string;
  value: string;
  isRequired: boolean;
  isFilterable: boolean;
  isActive: boolean;
};

type ServerVariant = {
  id: number;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  compareAtPrice: number | null;
  stockQuantity: number;
  trackInventory: boolean;
  lowStockThreshold: number | null;
  imageUrl: string | null;
  images: VariantImage[];
  isDefault: boolean;
  isAvailable: boolean;
  sortOrder: number;
  optionSelections: Record<string, string>;
  hasOrderHistory: boolean;
  orderItemCount: number;
};

type LoadResponse = {
  success?: boolean;
  message?: string;
  currency?: string;
  product?: {
    name: string;
    price: number;
    compareAtPrice: number | null;
  };
  options?: {
    id: number;
    name: string;
    sortOrder: number;
    values: {
      id: number;
      value: string;
      colorCode: string | null;
      sortOrder: number;
    }[];
  }[];
  variants?: ServerVariant[];
  attributes?: {
    id: number;
    name: string;
    label: string;
    type: AttributeType;
    options: unknown;
    isRequired: boolean;
    isFilterable: boolean;
    isActive: boolean;
    sortOrder: number;
    value: string;
  }[];
};

const inputClass =
  "w-full min-w-0 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-black/75 outline-none focus:border-[#d71920]/50 focus:ring-2 focus:ring-[#d71920]/10";

const labelClass =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-black/45";

const buttonClass =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold text-black/65 transition hover:border-black/20 hover:bg-black/[0.025] disabled:cursor-not-allowed disabled:opacity-40";

const primaryButtonClass =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-[#d71920] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#c5151c] disabled:cursor-not-allowed disabled:opacity-50";

function makeAttributeKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function splitValues(value: string) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value.split(",")) {
    const clean = item.trim();

    if (!clean) continue;

    const key = clean.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  }

  return result;
}

function combinationKey(
  selections: Record<string, string>,
) {
  return Object.keys(selections)
    .sort((a, b) => a.localeCompare(b))
    .map(
      (name) => `${name}=${selections[name]}`,
    )
    .join("|");
}

function createEmptyVariant(
  productPrice: number,
): Variant {
  return {
    id: null,
    title: "Default",
    sku: "",
    barcode: "",
    price: String(productPrice),
    compareAtPrice: "",
    stockQuantity: "0",
    trackInventory: false,
    lowStockThreshold: "",
    imageUrl: "",
    images: [],
    isDefault: true,
    isAvailable: true,
    selections: {},
    hasOrderHistory: false,
    orderItemCount: 0,
  };
}

function mapServerVariant(
  variant: ServerVariant,
): Variant {
  return {
    id: variant.id,
    title: variant.title,
    sku: variant.sku ?? "",
    barcode: variant.barcode ?? "",
    price: String(variant.price),
    compareAtPrice:
      variant.compareAtPrice == null
        ? ""
        : String(variant.compareAtPrice),
    stockQuantity: String(variant.stockQuantity),
    trackInventory: variant.trackInventory,
    lowStockThreshold:
      variant.lowStockThreshold == null
        ? ""
        : String(variant.lowStockThreshold),
    imageUrl: variant.imageUrl ?? "",
    images: variant.images ?? [],
    isDefault: variant.isDefault,
    isAvailable: variant.isAvailable,
    selections: variant.optionSelections ?? {},
    hasOrderHistory: variant.hasOrderHistory,
    orderItemCount: variant.orderItemCount,
  };
}

export default function ProductVariantsManager({
  productId,
}: {
  productId: number;
}) {
  const router = useRouter();

  const [productName, setProductName] = useState("");
  const [currency, setCurrency] = useState("LKR");

  const [optionDrafts, setOptionDrafts] =
    useState<OptionDraft[]>([]);

  const [variants, setVariants] =
    useState<Variant[]>([]);

  const [attributes, setAttributes] =
    useState<Attribute[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [optionsDirty, setOptionsDirty] = useState(false);

  const [uploadingVariantId, setUploadingVariantId] =
  useState<number | null>(null);

const [busyImageId, setBusyImageId] =
  useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/products/${productId}/variants`,
        {
          cache: "no-store",
        },
      );

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data =
        (await response.json()) as LoadResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to load variants.",
        );
      }

      const price = Number(
        data.product?.price ?? 0,
      );

      setProductName(
        data.product?.name ?? "Product",
      );

      setCurrency(
        data.currency || "LKR",
      );

      setOptionDrafts(
        (data.options ?? []).map((option) => ({
          name: option.name,
          valuesText: option.values
            .map((item) => item.value)
            .join(", "),
        })),
      );

      setVariants(
        (data.variants ?? []).map(
          mapServerVariant,
        ),
      );

      setAttributes(
        (data.attributes ?? []).map(
          (attribute) => ({
            id: attribute.id,
            name: attribute.name,
            label: attribute.label,
            type: attribute.type,
            optionsText: Array.isArray(
              attribute.options,
            )
              ? attribute.options
                  .map(String)
                  .join(", ")
              : "",
            value: attribute.value ?? "",
            isRequired: attribute.isRequired,
            isFilterable: attribute.isFilterable,
            isActive: attribute.isActive,
          }),
        ),
      );

      if (
        (data.variants ?? []).length === 0
      ) {
        setVariants([
          createEmptyVariant(price),
        ]);
      }

      setOptionsDirty(false);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load variants.",
      );
    } finally {
      setLoading(false);
    }
  }, [productId, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadData]);

  function updateOption(
    index: number,
    field: keyof OptionDraft,
    value: string,
  ) {
    setOptionDrafts((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index
          ? {
              ...option,
              [field]: value,
            }
          : option,
      ),
    );

    setOptionsDirty(true);
    setSuccess("");
  }

  function addOption() {
    if (optionDrafts.length >= 3) return;

    setOptionDrafts((current) => [
      ...current,
      {
        name: "",
        valuesText: "",
      },
    ]);

    setOptionsDirty(true);
    setSuccess("");
  }

  function removeOption(index: number) {
    setOptionDrafts((current) =>
      current.filter(
        (_, optionIndex) =>
          optionIndex !== index,
      ),
    );

    setOptionsDirty(true);
    setSuccess("");
  }

  function updateVariant(
    index: number,
    patch: Partial<Variant>,
  ) {
    setVariants((current) =>
      current.map((variant, variantIndex) =>
        variantIndex === index
          ? {
              ...variant,
              ...patch,
            }
          : {
              ...variant,
              ...(patch.isDefault === true
                ? { isDefault: false }
                : {}),
            },
      ),
    );

    setSuccess("");
  }

  async function handleVariantImageUpload(
  index: number,
  fileList: FileList | null,
) {
  const variant = variants[index];

  if (!variant || !fileList?.length) {
    return;
  }

  if (variant.id === null) {
    setError(
      "Save the variants first, then upload their images.",
    );
    return;
  }

  const chosen = Array.from(fileList);
  const remaining = 3 - variant.images.length;

  if (chosen.length > remaining) {
    setError(
      `This variant can have only 3 images. You can add ${remaining} more.`,
    );
    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  const invalidFile = chosen.find(
    (file) => !allowedTypes.includes(file.type),
  );

  if (invalidFile) {
    setError(
      `${invalidFile.name} is not supported. Use JPG, PNG or WebP.`,
    );
    return;
  }

  const oversizedFile = chosen.find(
    (file) => file.size > 15 * 1024 * 1024,
  );

  if (oversizedFile) {
    setError(
      `${oversizedFile.name} is larger than 15 MB.`,
    );
    return;
  }

  setUploadingVariantId(variant.id);
  setError("");
  setSuccess("");

  try {
    const formData = new FormData();

    chosen.forEach((file) => {
      formData.append("images", file);
    });

    const response = await fetch(
      `/api/admin/products/${productId}/variants/${variant.id}/images`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (response.status === 401) {
      router.push("/admin/login");
      return;
    }

    const data = (await response.json()) as {
      success?: boolean;
      message?: string;
      images?: VariantImage[];
    };

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
          "Failed to upload variant images.",
      );
    }

    const images = data.images ?? [];

    setVariants((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              images,
              imageUrl:
                images.find(
                  (image) => image.isPrimary,
                )?.imageUrl ??
                images[0]?.imageUrl ??
                "",
            }
          : item,
      ),
    );

    setSuccess(
      data.message ||
        "Variant images uploaded successfully.",
    );
  } catch (uploadError) {
    setError(
      uploadError instanceof Error
        ? uploadError.message
        : "Failed to upload variant images.",
    );
  } finally {
    setUploadingVariantId(null);
  }
}

async function handleRemoveVariantImage(
  index: number,
  image: VariantImage,
) {
  const variant = variants[index];

  if (
    !variant ||
    variant.id === null ||
    busyImageId !== null
  ) {
    return;
  }

  setBusyImageId(image.id);
  setError("");
  setSuccess("");

  try {
    const response = await fetch(
      `/api/admin/products/${productId}/variants/${variant.id}/images/${image.id}`,
      {
        method: "DELETE",
      },
    );

    if (response.status === 401) {
      router.push("/admin/login");
      return;
    }

    const data = (await response.json()) as {
      success?: boolean;
      message?: string;
    };

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
          "Failed to remove variant image.",
      );
    }

    setSuccess(
      "Variant image removed successfully.",
    );

    await loadData();
  } catch (removeError) {
    setError(
      removeError instanceof Error
        ? removeError.message
        : "Failed to remove variant image.",
    );
  } finally {
    setBusyImageId(null);
  }
}

  function generateCombinations() {
    setError("");
    setSuccess("");

    try {
      const cleanOptions: {
        name: string;
        values: string[];
      }[] = [];

      const names = new Set<string>();

      for (const draft of optionDrafts) {
        const name = draft.name.trim();
        const values = splitValues(
          draft.valuesText,
        );

        if (!name && values.length === 0) {
          continue;
        }

        if (!name) {
          throw new Error(
            "Every option needs a name.",
          );
        }

        if (values.length === 0) {
          throw new Error(
            `Enter values for the ${name} option, separated by commas.`,
          );
        }

        if (values.length > 100) {
          throw new Error(
            `The ${name} option has too many values.`,
          );
        }

        const key = name.toLowerCase();

        if (names.has(key)) {
          throw new Error(
            `The option "${name}" is repeated.`,
          );
        }

        names.add(key);

        cleanOptions.push({
          name,
          values,
        });
      }

      if (cleanOptions.length > 3) {
        throw new Error(
          "Use no more than three options per product.",
        );
      }

      const combinations:
        Record<string, string>[] = [];

      function build(
        optionIndex: number,
        current: Record<string, string>,
      ) {
        if (
          combinations.length >= 250
        ) {
          throw new Error(
            "This would create more than 250 variants. Reduce the option values.",
          );
        }

        if (
          optionIndex >= cleanOptions.length
        ) {
          combinations.push({
            ...current,
          });
          return;
        }

        const option =
          cleanOptions[optionIndex];

        for (const value of option.values) {
          current[option.name] = value;

          build(
            optionIndex + 1,
            current,
          );
        }

        delete current[option.name];
      }

      build(0, {});

      const existingByKey = new Map<
        string,
        Variant
      >();

      for (const variant of variants) {
        existingByKey.set(
          combinationKey(variant.selections),
          variant,
        );
      }

      const defaultVariant =
        variants.find(
          (variant) => variant.isDefault,
        ) ??
        variants[0] ??
        createEmptyVariant(0);

      const generated = combinations.map(
        (selections, index) => {
          const exact =
            existingByKey.get(
              combinationKey(selections),
            );

          const source =
            exact ??
            (index === 0
              ? defaultVariant
              : undefined);

          const title =
            Object.values(selections).join(
              " / ",
            ) || "Default";

          return {
            id: source?.id ?? null,
            title,
            sku: exact
              ? exact.sku
              : index === 0
                ? defaultVariant.sku
                : "",
            barcode: exact
              ? exact.barcode
              : index === 0
                ? defaultVariant.barcode
                : "",
            price:
              source?.price ??
              defaultVariant.price,
            compareAtPrice:
              source?.compareAtPrice ?? "",
            stockQuantity:
              source?.stockQuantity ?? "0",
            trackInventory:
              source?.trackInventory ?? false,
            lowStockThreshold:
              source?.lowStockThreshold ?? "",
            imageUrl:
              source?.imageUrl ?? "",
              images:
              source?.images ?? [],
            isDefault:
              source?.isDefault ?? index === 0,
            isAvailable:
              source?.isAvailable ?? true,
            selections,
            hasOrderHistory:
              source?.hasOrderHistory ?? false,
            orderItemCount:
              source?.orderItemCount ?? 0,
          };
        },
      );

      setOptionDrafts(
        cleanOptions.map((option) => ({
          name: option.name,
          valuesText: option.values.join(", "),
        })),
      );

      setVariants(generated);
      setOptionsDirty(false);

      setSuccess(
        `${generated.length} variant combination(s) generated. Review prices, SKUs and stock before saving.`,
      );
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Failed to generate variants.",
      );
    }
  }

  function addAttribute() {
    setAttributes((current) => [
      ...current,
      {
        name: "",
        label: "",
        type: "TEXT",
        optionsText: "",
        value: "",
        isRequired: false,
        isFilterable: false,
        isActive: true,
      },
    ]);

    setSuccess("");
  }

  function updateAttribute(
    index: number,
    patch: Partial<Attribute>,
  ) {
    setAttributes((current) =>
      current.map(
        (attribute, attributeIndex) =>
          attributeIndex === index
            ? {
                ...attribute,
                ...patch,
              }
            : attribute,
      ),
    );

    setSuccess("");
  }

  function removeAttribute(index: number) {
    setAttributes((current) =>
      current.filter(
        (_, attributeIndex) =>
          attributeIndex !== index,
      ),
    );

    setSuccess(
      "Attribute removed from this form. Save to update its product value.",
    );
  }

  async function handleSave() {
    if (saving || loading) return;

    setError("");
    setSuccess("");

    if (optionsDirty) {
      setError(
        'You changed the options. Click "Generate combinations" before saving.',
      );
      return;
    }

    if (variants.length === 0) {
      setError(
        "A product must have at least one variant.",
      );
      return;
    }

    if (
      variants.filter(
        (variant) => variant.isDefault,
      ).length > 1
    ) {
      setError(
        "Select only one default variant.",
      );
      return;
    }

    const options = optionDrafts
      .filter(
        (option) =>
          option.name.trim() ||
          option.valuesText.trim(),
      )
      .map((option) => ({
        name: option.name.trim(),
        values: splitValues(
          option.valuesText,
        ),
      }));

    const optionNames = new Set(
      options.map((option) =>
        option.name.toLowerCase(),
      ),
    );

    if (
      optionNames.size !== options.length
    ) {
      setError(
        "Option names must be unique.",
      );
      return;
    }

    for (const variant of variants) {
      const price = Number(
        variant.price,
      );

      if (
        variant.price.trim() === "" ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        setError(
          `Enter a valid price for "${variant.title}".`,
        );
        return;
      }

      const stock = Number(
        variant.stockQuantity,
      );

      if (
        !Number.isSafeInteger(stock) ||
        stock < 0
      ) {
        setError(
          `Enter a valid stock quantity for "${variant.title}".`,
        );
        return;
      }
    }

    const preparedAttributes: {
      name: string;
      label: string;
      type: AttributeType;
      options: string[];
      value: string;
      isRequired: boolean;
      isFilterable: boolean;
      isActive: boolean;
    }[] = [];

    const attributeNames = new Set<string>();

    for (const attribute of attributes) {
      const label = attribute.label.trim();

      if (!label) continue;

      const name = makeAttributeKey(
        attribute.name.trim() || label,
      );

      if (!name) {
        setError(
          `Enter a valid name for the "${label}" attribute.`,
        );
        return;
      }

      if (attributeNames.has(name)) {
        setError(
          `The attribute "${label}" is repeated.`,
        );
        return;
      }

      attributeNames.add(name);

      const allowedValues = splitValues(
        attribute.optionsText,
      );

      preparedAttributes.push({
        name,
        label,
        type: attribute.type,
        options: allowedValues,
        value: attribute.value.trim(),
        isRequired: attribute.isRequired,
        isFilterable: attribute.isFilterable,
        isActive: attribute.isActive,
      });
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/admin/products/${productId}/variants`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            options,
            variants: variants.map(
              (variant, index) => ({
                id: variant.id,
                title:
                  variant.title.trim() ||
                  `Variant ${index + 1}`,
                sku:
                  variant.sku.trim() || null,
                barcode:
                  variant.barcode.trim() || null,
                price: Number(
                  variant.price,
                ),
                compareAtPrice:
                  variant.compareAtPrice.trim()
                    ? Number(
                        variant.compareAtPrice,
                      )
                    : null,
                stockQuantity: Number(
                  variant.stockQuantity,
                ),
                trackInventory:
                  variant.trackInventory,
                lowStockThreshold:
                  variant.lowStockThreshold.trim()
                    ? Number(
                        variant.lowStockThreshold,
                      )
                    : null,
                imageUrl:
                  variant.imageUrl.trim() ||
                  null,
                isDefault:
                  variant.isDefault ||
                  (index === 0 &&
                    !variants.some(
                      (item) =>
                        item.isDefault,
                    )),
                isAvailable:
                  variant.isAvailable,
                selections:
                  variant.selections,
              }),
            ),
            attributes: preparedAttributes,
          }),
        },
      );

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Failed to save variants.",
        );
      }

      setSuccess(
        "Variants and custom attributes saved successfully.",
      );

      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save variants.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-black/7 bg-white p-6">
        <div className="flex items-center gap-2 text-xs text-black/45">
          <LoaderCircle
            size={16}
            className="animate-spin"
          />
          Loading product variants...
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-2xl border border-black/7 bg-white p-4 shadow-[0_12px_38px_rgba(0,0,0,0.035)] sm:p-6">
      <header className="flex flex-col gap-3 border-b border-black/7 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/35">
            Catalog configuration
          </p>

          <h2 className="mt-1 text-lg font-semibold tracking-tight text-black/85">
            Variants & custom attributes
          </h2>

          <p className="mt-1 text-xs text-black/45">
            Configure product choices, prices, stock and additional details for {productName}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={saving}
          className={buttonClass}
        >
          <RefreshCw size={13} />
          Reload
        </button>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700"
        >
          {success}
        </div>
      ) : null}

      {/* PRODUCT OPTIONS */}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-black/80">
              1. Product options
            </h3>

            <p className="mt-1 text-[11px] text-black/40">
              Example: Color = Black, White. Separate values with commas.
            </p>
          </div>

          <button
            type="button"
            onClick={addOption}
            disabled={
              optionDrafts.length >= 3 ||
              saving
            }
            className={buttonClass}
          >
            <Plus size={13} />
            Add option
          </button>
        </div>

        {optionDrafts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/15 bg-[#fafafa] p-4 text-xs text-black/45">
            No shopper options yet. This product will use one default variant until you add options.
          </div>
        ) : (
          <div className="space-y-3">
            {optionDrafts.map(
              (option, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-xl border border-black/8 bg-[#fafafa] p-3 sm:grid-cols-[minmax(140px,0.75fr)_minmax(200px,1.5fr)_auto] sm:items-end"
                >
                  <label>
                    <span className={labelClass}>
                      Option name
                    </span>

                    <input
                      className={inputClass}
                      placeholder="e.g. Color"
                      value={option.name}
                      onChange={(event) =>
                        updateOption(
                          index,
                          "name",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label>
                    <span className={labelClass}>
                      Values separated by commas
                    </span>

                    <input
                      className={inputClass}
                      placeholder="Black, White, Silver"
                      value={option.valuesText}
                      onChange={(event) =>
                        updateOption(
                          index,
                          "valuesText",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      removeOption(index)
                    }
                    disabled={saving}
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                </div>
              ),
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={generateCombinations}
            disabled={saving}
            className={primaryButtonClass}
          >
            <RefreshCw size={13} />
            Generate combinations
          </button>

          {optionsDirty ? (
            <p className="text-[11px] font-medium text-amber-700">
              Options changed. Generate combinations before saving.
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-t border-black/7" />

      {/* VARIANTS */}

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-black/80">
            2. Variant pricing & stock
          </h3>

          <p className="mt-1 text-[11px] text-black/40">
            Currency: {currency}. Each combination can have its own SKU, price and inventory settings.
          </p>
        </div>

        {variants.map(
          (variant, index) => (
            <article
              key={`${variant.id ?? "new"}-${index}`}
              className="space-y-4 rounded-xl border border-black/10 p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-full bg-black/[0.05] text-[10px] font-bold text-black/55">
                      {index + 1}
                    </span>

                    <h4 className="text-xs font-semibold text-black/80">
                      {variant.title || `Variant ${index + 1}`}
                    </h4>

                    {variant.isDefault ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">
                        Default
                      </span>
                    ) : null}

                    {variant.hasOrderHistory ? (
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-700">
                        {variant.orderItemCount} historical order item(s)
                      </span>
                    ) : null}
                  </div>

                  {Object.keys(
                    variant.selections,
                  ).length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(
                        variant.selections,
                      ).map(
                        ([name, value]) => (
                          <span
                            key={name}
                            className="rounded-md bg-[#f5f5f3] px-2 py-1 text-[10px] text-black/55"
                          >
                            {name}: {value}
                          </span>
                        ),
                      )}
                    </div>
                  ) : null}
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-[10px] font-semibold text-black/55">
                  <input
                    type="radio"
                    name={`default-variant-${productId}`}
                    checked={variant.isDefault}
                    onChange={() => {
                      setVariants((current) =>
                        current.map(
                          (item, itemIndex) => ({
                            ...item,
                            isDefault:
                              itemIndex === index,
                          }),
                        ),
                      );
                    }}
                    disabled={saving}
                  />
                  Make default
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <label>
                  <span className={labelClass}>
                    Variant title
                  </span>

                  <input
                    className={inputClass}
                    value={variant.title}
                    onChange={(event) =>
                      updateVariant(index, {
                        title: event.target.value,
                      })
                    }
                    disabled={saving}
                  />
                </label>

                <label>
                  <span className={labelClass}>
                    SKU
                  </span>

                  <input
                    className={inputClass}
                    placeholder="Optional"
                    value={variant.sku}
                    onChange={(event) =>
                      updateVariant(index, {
                        sku: event.target.value,
                      })
                    }
                    disabled={saving}
                  />
                </label>

                <label>
                  <span className={labelClass}>
                    Barcode
                  </span>

                  <input
                    className={inputClass}
                    placeholder="Optional"
                    value={variant.barcode}
                    onChange={(event) =>
                      updateVariant(index, {
                        barcode: event.target.value,
                      })
                    }
                    disabled={saving}
                  />
                </label>

                <label>
                  <span className={labelClass}>
                    Selling price ({currency})
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    value={variant.price}
                    onChange={(event) =>
                      updateVariant(index, {
                        price: event.target.value,
                      })
                    }
                    disabled={saving}
                  />
                </label>

                <label>
                  <span className={labelClass}>
                    Compare-at price ({currency})
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    placeholder="Optional"
                    value={variant.compareAtPrice}
                    onChange={(event) =>
                      updateVariant(index, {
                        compareAtPrice:
                          event.target.value,
                      })
                    }
                    disabled={saving}
                  />
                </label>

                <label>
                  <span className={labelClass}>
                    Stock quantity
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={inputClass}
                    value={variant.stockQuantity}
                    onChange={(event) =>
                      updateVariant(index, {
                        stockQuantity:
                          event.target.value,
                      })
                    }
                    disabled={saving}
                  />
                </label>

                <label>
                  <span className={labelClass}>
                    Low-stock threshold
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={inputClass}
                    placeholder="Optional"
                    value={variant.lowStockThreshold}
                    onChange={(event) =>
                      updateVariant(index, {
                        lowStockThreshold:
                          event.target.value,
                      })
                    }
                    disabled={saving}
                  />
                </label>

                <div className="sm:col-span-2 xl:col-span-3">
  <div className="mb-2 flex items-center justify-between gap-2">
    <span className={labelClass}>
      Variant images
    </span>

    <span className="text-[10px] text-black/40">
      {variant.images.length}/3 images
    </span>
  </div>

  <div className="flex flex-wrap items-center gap-3">
    {variant.images.map((image) => (
      <div
        key={image.id}
        className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-[#f5f5f3]"
      >
        <Image
          src={image.imageUrl}
          alt={image.altText || variant.title}
          width={64}
          height={64}
          unoptimized
          className="h-full w-full object-cover"
        />

        {image.isPrimary ? (
          <span className="absolute bottom-0 left-0 right-0 bg-black/65 px-1 py-0.5 text-center text-[8px] font-medium text-white">
            Main
          </span>
        ) : null}

        <button
          type="button"
          onClick={() =>
            void handleRemoveVariantImage(
              index,
              image,
            )
          }
          disabled={
            saving ||
            busyImageId !== null ||
            uploadingVariantId === variant.id
          }
          aria-label="Remove variant image"
          title="Remove image"
          className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-white/95 text-sm font-bold leading-none text-red-600 shadow-sm transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          ×
        </button>

        {busyImageId === image.id ? (
          <div className="absolute inset-0 grid place-items-center bg-black/35">
            <RefreshCw
              size={16}
              className="animate-spin text-white"
            />
          </div>
        ) : null}
      </div>
    ))}

    {variant.id !== null &&
    variant.images.length < 3 ? (
      <label className="grid size-16 shrink-0 cursor-pointer place-items-center rounded-lg border border-dashed border-black/20 bg-[#fafafa] text-black/40 transition hover:border-[#d71920]/50 hover:bg-red-50 hover:text-[#d71920]">
        {uploadingVariantId === variant.id ? (
          <RefreshCw
            size={17}
            className="animate-spin"
          />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Plus size={18} />

            <span className="text-[9px] font-semibold">
              Add image
            </span>
          </div>
        )}

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          disabled={
            saving ||
            uploadingVariantId === variant.id ||
            variant.images.length >= 3
          }
          onChange={(event) => {
            void handleVariantImageUpload(
              index,
              event.currentTarget.files,
            );

            event.currentTarget.value = "";
          }}
        />
      </label>
    ) : null}
  </div>

  <p className="mt-2 text-[10px] leading-relaxed text-black/40">
    Upload JPG, PNG or WebP. Each image is
    compressed to WebP, with a maximum of 2 MB
    per image. You can upload up to 3 images
    for this variant.
  </p>

  {variant.id === null ? (
    <p className="mt-1 text-[10px] font-medium text-amber-700">
      Save variants first to enable image uploads.
    </p>
  ) : null}
</div>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-3 border-t border-black/7 pt-3">
                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-black/65">
                  <input
                    type="checkbox"
                    checked={variant.trackInventory}
                    onChange={(event) =>
                      updateVariant(index, {
                        trackInventory:
                          event.target.checked,
                      })
                    }
                    disabled={saving}
                  />
                  Track inventory
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-black/65">
                  <input
                    type="checkbox"
                    checked={variant.isAvailable}
                    onChange={(event) =>
                      updateVariant(index, {
                        isAvailable:
                          event.target.checked,
                      })
                    }
                    disabled={saving}
                  />
                  Variant available
                </label>
              </div>

              {!variant.trackInventory ? (
                <p className="text-[10px] text-black/40">
                  Inventory tracking is disabled. Stock quantity is saved, but this setting is not yet enforced in checkout.
                </p>
              ) : null}
            </article>
          ),
        )}
      </div>

      <div className="border-t border-black/7" />

      {/* CUSTOM ATTRIBUTES */}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-black/80">
              3. Custom product attributes
            </h3>

            <p className="mt-1 text-[11px] text-black/40">
              Examples: Material, Skin Type, Ingredients or Finish.
            </p>
          </div>

          <button
            type="button"
            onClick={addAttribute}
            disabled={saving}
            className={buttonClass}
          >
            <Plus size={13} />
            Add attribute
          </button>
        </div>

        {attributes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/15 bg-[#fafafa] p-4 text-xs text-black/45">
            No custom attributes defined for this store yet.
          </div>
        ) : (
          <div className="space-y-3">
            {attributes.map(
              (attribute, index) => (
                <article
                  key={`${attribute.id ?? "new"}-${index}`}
                  className="space-y-3 rounded-xl border border-black/8 bg-[#fafafa] p-3"
                >
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <label>
                      <span className={labelClass}>
                        Attribute label
                      </span>

                      <input
                        className={inputClass}
                        placeholder="e.g. Material"
                        value={attribute.label}
                        onChange={(event) =>
                          updateAttribute(
                            index,
                            {
                              label: event.target.value,
                              ...(attribute.id
                                ? {}
                                : {
                                    name: makeAttributeKey(
                                      event.target.value,
                                    ),
                                  }),
                            },
                          )
                        }
                        disabled={saving}
                      />
                    </label>

                    <label>
                      <span className={labelClass}>
                        Field type
                      </span>

                      <select
                        className={inputClass}
                        value={attribute.type}
                        onChange={(event) =>
                          updateAttribute(
                            index,
                            {
                              type: event.target.value as AttributeType,
                              value: "",
                            },
                          )
                        }
                        disabled={saving}
                      >
                        <option value="TEXT">
                          Text
                        </option>
                        <option value="NUMBER">
                          Number
                        </option>
                        <option value="BOOLEAN">
                          Yes / No
                        </option>
                        <option value="SELECT">
                          Single selection
                        </option>
                        <option value="MULTI_SELECT">
                          Multiple selections
                        </option>
                      </select>
                    </label>

                    <label>
                      <span className={labelClass}>
                        Attribute key
                      </span>

                      <input
                        className={inputClass}
                        value={attribute.name}
                        onChange={(event) =>
                          updateAttribute(
                            index,
                            {
                              name: makeAttributeKey(
                                event.target.value,
                              ),
                            },
                          )
                        }
                        disabled={saving || Boolean(attribute.id)}
                      />
                    </label>
                  </div>

                  {attribute.type === "SELECT" ||
                  attribute.type === "MULTI_SELECT" ? (
                    <label className="block">
                      <span className={labelClass}>
                        Allowed values, separated by commas
                      </span>

                      <input
                        className={inputClass}
                        placeholder="e.g. Oily, Dry, Combination"
                        value={attribute.optionsText}
                        onChange={(event) =>
                          updateAttribute(
                            index,
                            {
                              optionsText:
                                event.target.value,
                            },
                          )
                        }
                        disabled={saving}
                      />
                    </label>
                  ) : null}

                  <label className="block">
                    <span className={labelClass}>
                      Product value
                    </span>

                    {attribute.type === "BOOLEAN" ? (
                      <select
                        className={inputClass}
                        value={attribute.value}
                        onChange={(event) =>
                          updateAttribute(
                            index,
                            {
                              value: event.target.value,
                            },
                          )
                        }
                        disabled={saving}
                      >
                        <option value="">
                          Not specified
                        </option>
                        <option value="true">
                          Yes
                        </option>
                        <option value="false">
                          No
                        </option>
                      </select>
                    ) : attribute.type === "SELECT" ? (
                      <select
                        className={inputClass}
                        value={attribute.value}
                        onChange={(event) =>
                          updateAttribute(
                            index,
                            {
                              value: event.target.value,
                            },
                          )
                        }
                        disabled={saving}
                      >
                        <option value="">
                          Select a value
                        </option>

                        {splitValues(
                          attribute.optionsText,
                        ).map((option) => (
                          <option
                            key={option}
                            value={option}
                          >
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={
                          attribute.type === "NUMBER"
                            ? "number"
                            : "text"
                        }
                        className={inputClass}
                        placeholder={
                          attribute.type === "MULTI_SELECT"
                            ? "Enter selected values separated by commas"
                            : "Enter product value"
                        }
                        value={attribute.value}
                        onChange={(event) =>
                          updateAttribute(
                            index,
                            {
                              value: event.target.value,
                            },
                          )
                        }
                        disabled={saving}
                      />
                    )}
                  </label>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-black/7 pt-3">
                    <label className="flex cursor-pointer items-center gap-2 text-[11px] text-black/60">
                      <input
                        type="checkbox"
                        checked={attribute.isRequired}
                        onChange={(event) =>
                          updateAttribute(
                            index,
                            {
                              isRequired:
                                event.target.checked,
                            },
                          )
                        }
                        disabled={saving}
                      />
                      Required
                    </label>

                    <label className="flex cursor-pointer items-center gap-2 text-[11px] text-black/60">
                      <input
                        type="checkbox"
                        checked={attribute.isFilterable}
                        onChange={(event) =>
                          updateAttribute(
                            index,
                            {
                              isFilterable:
                                event.target.checked,
                            },
                          )
                        }
                        disabled={saving}
                      />
                      Filterable
                    </label>

                    <label className="flex cursor-pointer items-center gap-2 text-[11px] text-black/60">
                      <input
                        type="checkbox"
                        checked={attribute.isActive}
                        onChange={(event) =>
                          updateAttribute(
                            index,
                            {
                              isActive:
                                event.target.checked,
                            },
                          )
                        }
                        disabled={saving}
                      />
                      Active for this store
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        removeAttribute(index)
                      }
                      disabled={saving}
                      className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={12} />
                      Remove from form
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </div>

      {/* SAVE */}

      <footer className="flex flex-col gap-3 border-t border-black/7 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] leading-relaxed text-black/40">
          Saving updates the default product price to match the selected default variant. Inventory quantities are not deducted from orders by this editor.
        </p>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={
            saving ||
            loading ||
            optionsDirty ||
            variants.length === 0
          }
          className={primaryButtonClass}
        >
          {saving ? (
            <LoaderCircle
              size={14}
              className="animate-spin"
            />
          ) : (
            <Check size={14} />
          )}

          {saving
            ? "Saving..."
            : "Save variants & attributes"}
        </button>
      </footer>
    </section>
  );
}