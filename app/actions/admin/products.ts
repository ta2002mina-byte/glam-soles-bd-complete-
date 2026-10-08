"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminSession, roleAtLeast } from "@/lib/supabase/admin/guard";
import type { AdminActionResult, AdminProductInput, AdminVariantInput } from "@/types/admin";

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanList(values: unknown, maxItems = 30, maxLength = 60): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((v) => clean(v, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function validateProductInput(input: AdminProductInput): { error: string | null; clean: Record<string, unknown> } {
  const name = clean(input.name, 150);
  const slug = slugify(input.slug || input.name);
  const sku = clean(input.sku, 60);
  const regularPrice = Number(input.regularPrice);
  const salePrice = input.salePrice === null || input.salePrice === undefined ? null : Number(input.salePrice);
  const costPrice = input.costPrice === null || input.costPrice === undefined ? null : Number(input.costPrice);
  const weightGrams = input.weightGrams === null || input.weightGrams === undefined ? null : Number(input.weightGrams);

  if (name.length < 2) return { error: "Product name is required.", clean: {} };
  if (!slug) return { error: "Product slug could not be generated — check the name.", clean: {} };
  if (sku.length < 2) return { error: "SKU is required.", clean: {} };
  if (!input.categoryId) return { error: "Choose a category.", clean: {} };
  if (!Number.isFinite(regularPrice) || regularPrice < 0) return { error: "Enter a valid regular price.", clean: {} };
  if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0)) {
    return { error: "Enter a valid sale price.", clean: {} };
  }
  if (salePrice !== null && salePrice >= regularPrice) {
    return { error: "Sale price must be lower than the regular price.", clean: {} };
  }
  if (costPrice !== null && (!Number.isFinite(costPrice) || costPrice < 0)) {
    return { error: "Enter a valid cost price.", clean: {} };
  }
  if (weightGrams !== null && (!Number.isFinite(weightGrams) || weightGrams < 0)) {
    return { error: "Enter a valid weight.", clean: {} };
  }

  return {
    error: null,
    clean: {
      name,
      slug,
      sku,
      category_id: input.categoryId,
      brand_id: input.brandId || null,
      description: clean(input.description, 4000) || null,
      materials: clean(input.materials, 1000) || null,
      features: cleanList(input.features, 20, 120),
      size_fit_notes: clean(input.sizeFitNotes, 1000) || null,
      regular_price: regularPrice,
      sale_price: salePrice,
      cost_price: costPrice,
      weight_grams: weightGrams,
      tags: cleanList(input.tags, 20, 40),
      seo_title: clean(input.seoTitle, 160) || null,
      seo_description: clean(input.seoDescription, 300) || null,
      seo_keywords: cleanList(input.seoKeywords, 20, 60),
      images: cleanList(input.images, 12, 500),
      video_url: clean(input.videoUrl, 500) || null,
      is_active: Boolean(input.isActive),
      is_published: Boolean(input.isPublished),
    },
  };
}

async function requireManager() {
  const session = await getAdminSession();
  if (!session || !roleAtLeast(session.role, "manager")) {
    return null;
  }
  return session;
}

export async function createProduct(input: AdminProductInput): Promise<AdminActionResult & { id?: string }> {
  const session = await requireManager();
  if (!session) return { status: "error", message: "You don't have permission to manage products." };

  const { error: validationError, clean: row } = validateProductInput(input);
  if (validationError) return { status: "error", message: validationError };

  const supabase = await createClient();
  const { data, error } = await supabase.from("products").insert(row).select("id").single();

  if (error) {
    if (error.code === "23505") return { status: "error", message: "A product with that SKU or slug already exists." };
    return { status: "error", message: "Could not create the product. Please try again." };
  }

  revalidatePath("/admin/products");
  return { status: "success", id: data.id };
}

export async function updateProduct(id: string, input: AdminProductInput): Promise<AdminActionResult> {
  const session = await requireManager();
  if (!session) return { status: "error", message: "You don't have permission to manage products." };
  if (!id) return { status: "error", message: "Missing product." };

  const { error: validationError, clean: row } = validateProductInput(input);
  if (validationError) return { status: "error", message: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("products").update(row).eq("id", id);

  if (error) {
    if (error.code === "23505") return { status: "error", message: "A product with that SKU or slug already exists." };
    return { status: "error", message: "Could not update the product. Please try again." };
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  return { status: "success" };
}

export async function setProductFlags(
  id: string,
  flags: { isActive?: boolean; isPublished?: boolean }
): Promise<AdminActionResult> {
  const session = await requireManager();
  if (!session) return { status: "error", message: "You don't have permission to manage products." };

  const patch: Record<string, boolean> = {};
  if (typeof flags.isActive === "boolean") patch.is_active = flags.isActive;
  if (typeof flags.isPublished === "boolean") patch.is_published = flags.isPublished;
  if (Object.keys(patch).length === 0) return { status: "error", message: "Nothing to update." };

  const supabase = await createClient();
  const { error } = await supabase.from("products").update(patch).eq("id", id);
  if (error) return { status: "error", message: "Could not update the product." };

  revalidatePath("/admin/products");
  return { status: "success" };
}

export async function deleteProduct(id: string): Promise<AdminActionResult> {
  const session = await requireManager();
  if (!session) return { status: "error", message: "You don't have permission to manage products." };

  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    // Foreign-key restriction from order_items -> product_variants blocks
    // deleting a product that has real sales history. Archive instead.
    if (error.code === "23503") {
      return {
        status: "error",
        message: "This product has order history and can't be deleted. Archive it instead to hide it from the storefront.",
      };
    }
    return { status: "error", message: "Could not delete the product." };
  }

  revalidatePath("/admin/products");
  return { status: "success", message: "Product deleted." };
}

export async function saveVariants(productId: string, variants: AdminVariantInput[]): Promise<AdminActionResult> {
  const session = await requireManager();
  if (!session) return { status: "error", message: "You don't have permission to manage inventory." };
  if (!productId) return { status: "error", message: "Missing product." };

  const seen = new Set<string>();
  const rows = [];
  for (const v of variants ?? []) {
    const color = clean(v.color, 60);
    const size = clean(v.size, 30);
    const sku = clean(v.sku, 60);
    const stock = Number(v.stock);
    const lowStockThreshold = Number(v.lowStockThreshold);
    const priceOverride = v.priceOverride === null || v.priceOverride === undefined ? null : Number(v.priceOverride);

    if (!color || !size || !sku) return { status: "error", message: "Every variant needs a color, size, and SKU." };
    if (!Number.isInteger(stock) || stock < 0) return { status: "error", message: `Invalid stock for ${color} / ${size}.` };
    if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
      return { status: "error", message: `Invalid low-stock threshold for ${color} / ${size}.` };
    }
    if (priceOverride !== null && (!Number.isFinite(priceOverride) || priceOverride < 0)) {
      return { status: "error", message: `Invalid price override for ${color} / ${size}.` };
    }

    const dupeKey = `${color.toLowerCase()}::${size.toLowerCase()}`;
    if (seen.has(dupeKey)) return { status: "error", message: `Duplicate color/size combination: ${color} / ${size}.` };
    seen.add(dupeKey);

    rows.push({
      ...(v.id ? { id: v.id } : {}),
      product_id: productId,
      color,
      size,
      sku,
      stock,
      low_stock_threshold: lowStockThreshold,
      price_override: priceOverride,
    });
  }

  if (rows.length === 0) return { status: "error", message: "Add at least one color/size variant." };

  const supabase = await createClient();
  const { error } = await supabase.from("product_variants").upsert(rows, { onConflict: "id" });

  if (error) {
    if (error.code === "23505") return { status: "error", message: "A variant with that SKU (or color/size combination) already exists." };
    return { status: "error", message: "Could not save variants. Please try again." };
  }

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/inventory");
  return { status: "success" };
}

export async function deleteVariant(variantId: string, productId: string): Promise<AdminActionResult> {
  const session = await requireManager();
  if (!session) return { status: "error", message: "You don't have permission to manage inventory." };

  const supabase = await createClient();
  const { error } = await supabase.from("product_variants").delete().eq("id", variantId);

  if (error) {
    if (error.code === "23503") {
      return { status: "error", message: "This variant has order history and can't be deleted. Set its stock to 0 instead." };
    }
    return { status: "error", message: "Could not delete the variant." };
  }

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/inventory");
  return { status: "success" };
}
