import { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

type AttributeType =
  | "TEXT"
  | "NUMBER"
  | "BOOLEAN"
  | "SELECT"
  | "MULTI_SELECT";

type OptionInput = {
  name: string;
  values: string[];
};

type VariantInput = {
  id: number | null;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  compareAtPrice: number | null;
  stockQuantity: number;
  trackInventory: boolean;
  lowStockThreshold: number | null;
  imageUrl: string | null;
  isDefault: boolean;
  isAvailable: boolean;
  selections: Record<string, string>;
};

type AttributeInput = {
  name: string;
  label: string;
  type: AttributeType;
  options: string[];
  isRequired: boolean;
  isFilterable: boolean;
  isActive: boolean;
  value: string;
};

class ValidationError extends Error {}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function cleanText(
  value: unknown,
  maxLength = 1000,
): string {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function nullableText(
  value: unknown,
  maxLength = 1000,
): string | null {
  return cleanText(value, maxLength) || null;
}

function parsePositiveId(
  value: string,
): number | null {
  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0
    ? id
    : null;
}

function parseMoney(
  value: unknown,
  label: string,
  optional = false,
): number | null {
  if (
    optional &&
    (value === null ||
      value === undefined ||
      value === "")
  ) {
    return null;
  }

  const amount = Number(value);

  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > 9_999_999_999.99
  ) {
    throw new ValidationError(
      `${label} must be a valid non-negative amount.`,
    );
  }

  return Math.round(amount * 100) / 100;
}

function parseInteger(
  value: unknown,
  label: string,
  optional = false,
): number | null {
  if (
    optional &&
    (value === null ||
      value === undefined ||
      value === "")
  ) {
    return null;
  }

  const result = Number(value ?? 0);

  if (
    !Number.isSafeInteger(result) ||
    result < 0
  ) {
    throw new ValidationError(
      `${label} must be a whole number of zero or greater.`,
    );
  }

  return result;
}

function parseCsvArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    const text = cleanText(item, 150);
    const key = text.toLocaleLowerCase();

    if (text && !seen.has(key)) {
      seen.add(key);
      result.push(text);
    }
  }

  return result;
}

function makeAttributeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function combinationKey(
  selections: Record<string, string>,
): string {
  return Object.keys(selections)
    .sort((a, b) => a.localeCompare(b))
    .map(
      (name) =>
        `${name}=${selections[name]}`,
    )
    .join("|");
}

/*
|--------------------------------------------------------------------------
| STORE AUTHORIZATION
|--------------------------------------------------------------------------
|
| Uses the logged-in session's store slug.
| A product belonging to another store cannot be managed here.
|
*/

async function authorizeStoreManager() {
  const session = await getSession();

  if (!session) {
    return {
      error: "Unauthorized",
      status: 401 as const,
    };
  }

  const user = await prisma.store_user.findFirst({
    where: {
      id: session.userId,
      storeId: session.storeId,
      isActive: true,
    },
    include: {
      store: {
        select: {
          isActive: true,
        },
      },
    },
  });

  if (!user || !user.store.isActive) {
    return {
      error: "Account or store is inactive",
      status: 403 as const,
    };
  }

  if (
    user.role !== "OWNER" &&
    user.role !== "ADMIN"
  ) {
    return {
      error: "You do not have permission to manage product variants",
      status: 403 as const,
    };
  }

  return {
    storeId: user.storeId,
  };
}

/*
|--------------------------------------------------------------------------
| VALIDATE SHOPPER OPTIONS
|--------------------------------------------------------------------------
*/

function parseOptions(
  value: unknown,
): OptionInput[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(
      "Options must be a list.",
    );
  }

  if (value.length > 3) {
    throw new ValidationError(
      "A product can have at most three options in this version.",
    );
  }

  const result: OptionInput[] = [];
  const seenNames = new Set<string>();

  for (const raw of value) {
    if (!isObject(raw)) {
      throw new ValidationError(
        "An option is invalid.",
      );
    }

    const name = cleanText(raw.name, 100);

    if (!name) {
      throw new ValidationError(
        "Every option needs a name, such as Color or Size.",
      );
    }

    const nameKey = name.toLowerCase();

    if (seenNames.has(nameKey)) {
      throw new ValidationError(
        `The option "${name}" is repeated.`,
      );
    }

    seenNames.add(nameKey);

    const values = Array.isArray(raw.values)
      ? raw.values
          .map((item) =>
            cleanText(item, 150),
          )
          .filter(Boolean)
      : [];

    if (values.length === 0) {
      throw new ValidationError(
        `Add at least one value for ${name}.`,
      );
    }

    if (values.length > 100) {
      throw new ValidationError(
        `The ${name} option has too many values.`,
      );
    }

    const seenValues = new Set<string>();

    for (const item of values) {
      const key = item.toLowerCase();

      if (seenValues.has(key)) {
        throw new ValidationError(
          `The value "${item}" is repeated in ${name}.`,
        );
      }

      seenValues.add(key);
    }

    result.push({
      name,
      values,
    });
  }

  return result;
}

/*
|--------------------------------------------------------------------------
| VALIDATE VARIANTS
|--------------------------------------------------------------------------
*/

function parseVariants(
  value: unknown,
  options: OptionInput[],
  productName: string,
): VariantInput[] {
  if (
    !Array.isArray(value) ||
    value.length === 0
  ) {
    throw new ValidationError(
      "A product must have at least one variant.",
    );
  }

  if (value.length > 250) {
    throw new ValidationError(
      "A product cannot have more than 250 variants.",
    );
  }

  const allowedValues = new Map(
    options.map((option) => [
      option.name,
      new Set(option.values),
    ]),
  );

  const seenIds = new Set<number>();
  const seenSkus = new Set<string>();
  const seenBarcodes = new Set<string>();
  const seenCombinations = new Set<string>();

  const variants: VariantInput[] = [];

  for (const raw of value) {
    if (!isObject(raw)) {
      throw new ValidationError(
        "A variant row is invalid.",
      );
    }

    let id: number | null = null;

    if (
      raw.id !== null &&
      raw.id !== undefined &&
      raw.id !== ""
    ) {
      id = Number(raw.id);

      if (
        !Number.isSafeInteger(id) ||
        id <= 0 ||
        seenIds.has(id)
      ) {
        throw new ValidationError(
          "A variant ID is invalid or repeated.",
        );
      }

      seenIds.add(id);
    }

    const title =
      cleanText(raw.title, 300) ||
      productName;

    const sku = nullableText(
      raw.sku,
      100,
    );

    const barcode = nullableText(
      raw.barcode,
      100,
    );

    if (sku) {
      const key = sku.toLowerCase();

      if (seenSkus.has(key)) {
        throw new ValidationError(
          `Variant SKU "${sku}" is repeated.`,
        );
      }

      seenSkus.add(key);
    }

    if (barcode) {
      const key = barcode.toLowerCase();

      if (seenBarcodes.has(key)) {
        throw new ValidationError(
          `Variant barcode "${barcode}" is repeated.`,
        );
      }

      seenBarcodes.add(key);
    }

    const price = parseMoney(
      raw.price,
      `Price for ${title}`,
    )!;

    const compareAtPrice = parseMoney(
      raw.compareAtPrice,
      `Compare-at price for ${title}`,
      true,
    );

    const stockQuantity = parseInteger(
      raw.stockQuantity,
      `Stock quantity for ${title}`,
    )!;

    const lowStockThreshold = parseInteger(
      raw.lowStockThreshold,
      `Low-stock threshold for ${title}`,
      true,
    );

    const imageUrl = nullableText(
      raw.imageUrl,
      1000,
    );

    const selections: Record<
      string,
      string
    > = {};

    if (isObject(raw.selections)) {
      for (const [name, selected] of Object.entries(
        raw.selections,
      )) {
        if (
          typeof selected === "string" &&
          selected.trim()
        ) {
          selections[name] = selected.trim();
        }
      }
    }

    if (options.length === 0) {
      if (
        Object.keys(selections).length > 0
      ) {
        throw new ValidationError(
          "Generate variants again after removing product options.",
        );
      }
    } else {
      if (
        Object.keys(selections).length !==
        options.length
      ) {
        throw new ValidationError(
          "Generate variants again after changing product options.",
        );
      }

      for (const option of options) {
        const selected =
          selections[option.name];

        if (
          !selected ||
          !allowedValues
            .get(option.name)
            ?.has(selected)
        ) {
          throw new ValidationError(
            `Invalid ${option.name} selection. Generate variants again.`,
          );
        }
      }
    }

    const key = combinationKey(selections);

    if (seenCombinations.has(key)) {
      throw new ValidationError(
        "Two variants have the same option combination.",
      );
    }

    seenCombinations.add(key);

    variants.push({
      id,
      title,
      sku,
      barcode,
      price,
      compareAtPrice,
      stockQuantity,
      trackInventory:
        raw.trackInventory === true,
      lowStockThreshold,
      imageUrl,
      isDefault:
        raw.isDefault === true,
      isAvailable:
        raw.isAvailable !== false,
      selections,
    });
  }

  const defaultCount = variants.filter(
    (variant) => variant.isDefault,
  ).length;

  if (defaultCount > 1) {
    throw new ValidationError(
      "Select only one default variant.",
    );
  }

  if (defaultCount === 0) {
    variants[0].isDefault = true;
  }

  return variants;
}

/*
|--------------------------------------------------------------------------
| VALIDATE CUSTOM ATTRIBUTES
|--------------------------------------------------------------------------
*/

function parseAttributes(
  value: unknown,
): AttributeInput[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(
      "Custom attributes must be a list.",
    );
  }

  if (value.length > 100) {
    throw new ValidationError(
      "Too many custom attributes were submitted.",
    );
  }

  const result: AttributeInput[] = [];
  const seenNames = new Set<string>();

  const validTypes: AttributeType[] = [
    "TEXT",
    "NUMBER",
    "BOOLEAN",
    "SELECT",
    "MULTI_SELECT",
  ];

  for (const raw of value) {
    if (!isObject(raw)) {
      continue;
    }

    const label = cleanText(
      raw.label,
      150,
    );

    if (!label) {
      continue;
    }

    const name = makeAttributeKey(
      cleanText(raw.name, 100) || label,
    );

    if (!name) {
      throw new ValidationError(
        `The attribute key for "${label}" is invalid.`,
      );
    }

    if (seenNames.has(name)) {
      throw new ValidationError(
        `The custom attribute "${label}" is repeated.`,
      );
    }

    seenNames.add(name);

    const type = validTypes.includes(
      raw.type as AttributeType,
    )
      ? (raw.type as AttributeType)
      : "TEXT";

    const options = parseCsvArray(
      raw.options,
    );

    if (
      (type === "SELECT" ||
        type === "MULTI_SELECT") &&
      options.length === 0
    ) {
      throw new ValidationError(
        `Add allowed values for the ${label} attribute.`,
      );
    }

    const attributeValue = cleanText(
      raw.value,
      4000,
    );

    if (
      raw.isRequired === true &&
      !attributeValue
    ) {
      throw new ValidationError(
        `The ${label} attribute is required.`,
      );
    }

    if (
      attributeValue &&
      type === "NUMBER" &&
      !Number.isFinite(Number(attributeValue))
    ) {
      throw new ValidationError(
        `${label} must contain a valid number.`,
      );
    }

    if (
      attributeValue &&
      type === "BOOLEAN" &&
      attributeValue !== "true" &&
      attributeValue !== "false"
    ) {
      throw new ValidationError(
        `${label} must be Yes or No.`,
      );
    }

    if (
      attributeValue &&
      type === "SELECT" &&
      !options.includes(attributeValue)
    ) {
      throw new ValidationError(
        `Choose a valid ${label} value.`,
      );
    }

    if (
      attributeValue &&
      type === "MULTI_SELECT"
    ) {
      const chosen = attributeValue
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (
        chosen.some(
          (item) => !options.includes(item),
        )
      ) {
        throw new ValidationError(
          `One or more ${label} values are invalid.`,
        );
      }
    }

    result.push({
      name,
      label,
      type,
      options,
      isRequired:
        raw.isRequired === true,
      isFilterable:
        raw.isFilterable === true,
      isActive:
        raw.isActive !== false,
      value: attributeValue,
    });
  }

  return result;
}

/*
|--------------------------------------------------------------------------
| GET: LOAD PRODUCT VARIANTS AND ATTRIBUTES
|--------------------------------------------------------------------------
*/

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const auth =
      await authorizeStoreManager();

    if ("error" in auth) {
      return NextResponse.json(
        {
          success: false,
          message: auth.error,
        },
        {
          status: auth.status,
        },
      );
    }

    const { productId: idText } =
      await context.params;

    const productId =
      parsePositiveId(idText);

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid product ID.",
        },
        { status: 400 },
      );
    }

    const product =
      await prisma.product.findFirst({
        where: {
          id: productId,
          storeId: auth.storeId,
        },
        select: {
          id: true,
          name: true,
          price: true,
          compareAtPrice: true,

          store: {
            select: {
              currency: true,
              settings: {
                select: {
                  currency: true,
                },
              },
            },
          },

          options: {
            orderBy: [
              { sortOrder: "asc" },
              { id: "asc" },
            ],
            select: {
              id: true,
              name: true,
              sortOrder: true,
              values: {
                orderBy: [
                  { sortOrder: "asc" },
                  { id: "asc" },
                ],
                select: {
                  id: true,
                  value: true,
                  colorCode: true,
                  sortOrder: true,
                },
              },
            },
          },

          variants: {
            orderBy: [
              { isDefault: "desc" },
              { sortOrder: "asc" },
              { id: "asc" },
            ],
            select: {
              id: true,
              title: true,
              sku: true,
              barcode: true,
              price: true,
              compareAtPrice: true,
              stockQuantity: true,
              trackInventory: true,
              lowStockThreshold: true,
              imageUrl: true,
              images: {
  orderBy: [
    { isPrimary: "desc" },
    { sortOrder: "asc" },
    { id: "asc" },
  ],
  select: {
    id: true,
    imageUrl: true,
    altText: true,
    sortOrder: true,
    isPrimary: true,
  },
},
              isDefault: true,
              isAvailable: true,
              sortOrder: true,

              optionValues: {
                select: {
                  optionValue: {
                    select: {
                      value: true,
                      option: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },

              _count: {
                select: {
                  orderItems: true,
                },
              },
            },
          },

          attributeValues: {
            select: {
              attributeId: true,
              value: true,
            },
          },
        },
      });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product not found in this store.",
        },
        { status: 404 },
      );
    }

    const definitions =
      await prisma.store_product_attribute.findMany({
        where: {
          storeId: auth.storeId,
        },
        orderBy: [
          { sortOrder: "asc" },
          { label: "asc" },
        ],
        select: {
          id: true,
          name: true,
          label: true,
          type: true,
          options: true,
          isRequired: true,
          isFilterable: true,
          isActive: true,
          sortOrder: true,
        },
      });

    const valuesById = new Map(
      product.attributeValues.map(
        (item) => [
          item.attributeId,
          item.value,
        ],
      ),
    );

    return NextResponse.json({
      success: true,

      product: {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        compareAtPrice:
          product.compareAtPrice === null
            ? null
            : Number(product.compareAtPrice),
      },

      currency:
        product.store.settings?.currency ||
        product.store.currency ||
        "LKR",

      options: product.options.map(
        (option) => ({
          id: option.id,
          name: option.name,
          sortOrder: option.sortOrder,
          values: option.values,
        }),
      ),

      variants: product.variants.map(
        (variant) => ({
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
          barcode: variant.barcode,
          price: Number(variant.price),
          compareAtPrice:
            variant.compareAtPrice === null
              ? null
              : Number(variant.compareAtPrice),
          stockQuantity:
            variant.stockQuantity,
          trackInventory:
            variant.trackInventory,
          lowStockThreshold:
            variant.lowStockThreshold,
          imageUrl: variant.imageUrl,
          images: variant.images,
          isDefault: variant.isDefault,
          isAvailable: variant.isAvailable,
          sortOrder: variant.sortOrder,

          optionSelections:
            Object.fromEntries(
              variant.optionValues.map(
                (link) => [
                  link.optionValue.option.name,
                  link.optionValue.value,
                ],
              ),
            ),

          hasOrderHistory:
            variant._count.orderItems > 0,

          orderItemCount:
            variant._count.orderItems,
        }),
      ),

      attributes: definitions.map(
        (attribute) => {
          const rawValue =
            valuesById.get(attribute.id) ?? "";

          let displayValue = rawValue;

          if (
            attribute.type === "MULTI_SELECT" &&
            rawValue
          ) {
            try {
              const parsed: unknown =
                JSON.parse(rawValue);

              if (Array.isArray(parsed)) {
                displayValue = parsed
                  .map(String)
                  .join(", ");
              }
            } catch {
              // Keep an existing plain-text value readable.
            }
          }

          return {
            ...attribute,
            options: Array.isArray(
              attribute.options,
            )
              ? attribute.options
              : [],
            value: displayValue,
          };
        },
      ),
    });
  } catch (error) {
    console.error(
      "GET product variants error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to load product variants.",
      },
      { status: 500 },
    );
  }
}

/*
|--------------------------------------------------------------------------
| PUT: SAVE VARIANTS AND CUSTOM ATTRIBUTES
|--------------------------------------------------------------------------
*/

export async function PUT(
  request: Request,
  context: RouteContext,
) {
  try {
    const auth =
      await authorizeStoreManager();

    if ("error" in auth) {
      return NextResponse.json(
        {
          success: false,
          message: auth.error,
        },
        {
          status: auth.status,
        },
      );
    }

    const { productId: idText } =
      await context.params;

    const productId =
      parsePositiveId(idText);

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid product ID.",
        },
        { status: 400 },
      );
    }

    const rawBody: unknown =
      await request.json();

    if (!isObject(rawBody)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body.",
        },
        { status: 400 },
      );
    }

    const product =
      await prisma.product.findFirst({
        where: {
          id: productId,
          storeId: auth.storeId,
        },
        select: {
          id: true,
          name: true,
        },
      });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product not found in this store.",
        },
        { status: 404 },
      );
    }

    const options =
      parseOptions(rawBody.options);

    const variants =
      parseVariants(
        rawBody.variants,
        options,
        product.name,
      );

    const attributes =
      parseAttributes(rawBody.attributes);

    const oldVariants =
      await prisma.product_variant.findMany({
        where: {
          productId,
          storeId: auth.storeId,
        },
        select: {
          id: true,
        },
      });

    const oldIds = new Set(
      oldVariants.map((item) => item.id),
    );

    const incomingIds = variants
      .map((variant) => variant.id)
      .filter(
        (id): id is number => id !== null,
      );

    for (const id of incomingIds) {
      if (!oldIds.has(id)) {
        throw new ValidationError(
          "A submitted variant does not belong to this product.",
        );
      }
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const existingVariants =
            await tx.product_variant.findMany({
              where: {
                productId,
                storeId: auth.storeId,
              },
              select: {
                id: true,
                _count: {
                  select: {
                    orderItems: true,
                  },
                },
              },
            });

          const incomingIdSet =
            new Set(incomingIds);

          // Remove variants that were removed from the editor.
          // Preserve rows referenced by orders.
          for (const existing of existingVariants) {
            if (
              incomingIdSet.has(existing.id)
            ) {
              continue;
            }

            if (
              existing._count.orderItems > 0
            ) {
              await tx.product_variant.update({
                where: {
                  id: existing.id,
                },
                data: {
                  isAvailable: false,
                  isDefault: false,
                  sku: null,
                  barcode: null,
                },
              });
            } else {
              await tx.product_variant.delete({
                where: {
                  id: existing.id,
                },
              });
            }
          }

          // Free up SKU/barcode values for edits and swaps.
          if (incomingIds.length > 0) {
            await tx.product_variant.updateMany({
              where: {
                productId,
                storeId: auth.storeId,
                id: {
                  in: incomingIds,
                },
              },
              data: {
                sku: null,
                barcode: null,
                isDefault: false,
              },
            });
          }

          // Rebuild the shopper options.
          // Their joins are recreated below.
          await tx.product_option.deleteMany({
            where: {
              productId,
            },
          });

          const optionValueIds =
            new Map<string, number>();

          for (
            let optionIndex = 0;
            optionIndex < options.length;
            optionIndex += 1
          ) {
            const option =
              options[optionIndex];

            const savedOption =
              await tx.product_option.create({
                data: {
                  productId,
                  name: option.name,
                  sortOrder: optionIndex,
                  values: {
                    create: option.values.map(
                      (value, index) => ({
                        value,
                        sortOrder: index,
                      }),
                    ),
                  },
                },
                include: {
                  values: {
                    select: {
                      id: true,
                      value: true,
                    },
                  },
                },
              });

            for (
              const optionValue of savedOption.values
            ) {
              optionValueIds.set(
                `${savedOption.name}\u0000${optionValue.value}`,
                optionValue.id,
              );
            }
          }

          const savedVariants: Array<{
            id: number;
            price: number;
            compareAtPrice: number | null;
            isDefault: boolean;
          }> = [];

          for (
            let index = 0;
            index < variants.length;
            index += 1
          ) {
            const variant = variants[index];

            const data = {
              storeId: auth.storeId,
              productId,
              title: variant.title,
              sku: variant.sku,
              barcode: variant.barcode,
              price: variant.price,
              compareAtPrice:
                variant.compareAtPrice,
              stockQuantity:
                variant.stockQuantity,
              trackInventory:
                variant.trackInventory,
              lowStockThreshold:
                variant.lowStockThreshold,
              imageUrl: variant.imageUrl,
              isDefault: variant.isDefault,
              isAvailable:
                variant.isAvailable,
              sortOrder: index,
            };

            const saved =
              variant.id !== null
                ? await tx.product_variant.update({
                    where: {
                      id: variant.id,
                    },
                    data,
                    select: {
                      id: true,
                      price: true,
                      compareAtPrice: true,
                      isDefault: true,
                    },
                  })
                : await tx.product_variant.create({
                    data,
                    select: {
                      id: true,
                      price: true,
                      compareAtPrice: true,
                      isDefault: true,
                    },
                  });

            const links = options.flatMap(
              (option) => {
                const selected =
                  variant.selections[option.name];

                const optionValueId =
                  optionValueIds.get(
                    `${option.name}\u0000${selected}`,
                  );

                return optionValueId
                  ? [
                      {
                        variantId: saved.id,
                        optionValueId,
                      },
                    ]
                  : [];
              },
            );

            if (links.length > 0) {
              await tx.product_variant_option_value.createMany({
                data: links,
              });
            }

            savedVariants.push({
              id: saved.id,
              price: Number(saved.price),
              compareAtPrice:
                saved.compareAtPrice === null
                  ? null
                  : Number(saved.compareAtPrice),
              isDefault: saved.isDefault,
            });
          }

          // Keep the existing product price compatible with the default variant.
          const defaultVariant =
            savedVariants.find(
              (variant) => variant.isDefault,
            ) ?? savedVariants[0];

          await tx.product.update({
            where: {
              id: productId,
            },
            data: {
              price: defaultVariant.price,
              compareAtPrice:
                defaultVariant.compareAtPrice,
            },
          });

          // Save store-wide attribute definitions and this product's values.
          for (
            let index = 0;
            index < attributes.length;
            index += 1
          ) {
            const attribute = attributes[index];

            const savedAttribute =
              await tx.store_product_attribute.upsert({
                where: {
                  storeId_name: {
                    storeId: auth.storeId,
                    name: attribute.name,
                  },
                },
                create: {
                  storeId: auth.storeId,
                  name: attribute.name,
                  label: attribute.label,
                  type: attribute.type,
                  options:
                    attribute.type === "SELECT" ||
                    attribute.type === "MULTI_SELECT"
                      ? attribute.options
                      : Prisma.DbNull,
                  isRequired:
                    attribute.isRequired,
                  isFilterable:
                    attribute.isFilterable,
                  isActive:
                    attribute.isActive,
                  sortOrder: index,
                },
                update: {
                  label: attribute.label,
                  type: attribute.type,
                  options:
                    attribute.type === "SELECT" ||
                    attribute.type === "MULTI_SELECT"
                      ? attribute.options
                      : Prisma.DbNull,
                  isRequired:
                    attribute.isRequired,
                  isFilterable:
                    attribute.isFilterable,
                  isActive:
                    attribute.isActive,
                  sortOrder: index,
                },
                select: {
                  id: true,
                },
              });

            if (!attribute.value) {
              await tx.product_attribute_value.deleteMany({
                where: {
                  productId,
                  attributeId: savedAttribute.id,
                },
              });

              continue;
            }

            const storedValue =
              attribute.type === "MULTI_SELECT"
                ? JSON.stringify(
                    attribute.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  )
                : attribute.value;

            await tx.product_attribute_value.upsert({
              where: {
                productId_attributeId: {
                  productId,
                  attributeId: savedAttribute.id,
                },
              },
              create: {
                productId,
                attributeId: savedAttribute.id,
                value: storedValue,
              },
              update: {
                value: storedValue,
              },
            });
          }

          return {
            variantCount: variants.length,
            optionCount: options.length,
            attributeCount: attributes.length,
          };
        },
      );

    return NextResponse.json({
      success: true,
      message:
        "Variants and attributes saved successfully.",
      ...result,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 400 },
      );
    }

    if (
      isObject(error) &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A variant SKU, barcode, option, or custom attribute key already exists in this store.",
        },
        { status: 409 },
      );
    }

    console.error(
      "PUT product variants error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to save variants and attributes.",
      },
      { status: 500 },
    );
  }
}