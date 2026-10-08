"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminRole } from "@/lib/supabase/admin-guard";
import type {
  CmsActionResult,
  BannerInput,
  ProductSearchResult,
  TestimonialInput,
} from "@/types/admin";

function clean(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

// ---------- Banners ----------

export async function upsertBanner(input: BannerInput): Promise<CmsActionResult> {
  await requireAdminRole("manager");
  const supabase = await createClient();

  const row = {
    placement: input.placement,
    title: clean(input.title, 120) || null,
    subtitle: clean(input.subtitle, 200) || null,
    desktop_image_url: clean(input.desktopImageUrl, 500) || null,
    mobile_image_url: clean(input.mobileImageUrl, 500) || null,
    cta_text: clean(input.ctaText, 40) || null,
    cta_link: clean(input.ctaLink, 300) || null,
    starts_at: input.startsAt || null,
    ends_at: input.endsAt || null,
    sort_order: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
    is_active: input.isActive,
  };

  const { error } = input.id
    ? await supabase.from("banners").update(row).eq("id", input.id)
    : await supabase.from("banners").insert(row);

  if (error) return { status: "error", message: "Couldn't save this banner. Please try again." };
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { status: "ok" };
}

export async function deleteBanner(id: string): Promise<CmsActionResult> {
  await requireAdminRole("manager");
  const supabase = await createClient();
  const { error } = await supabase.from("banners").delete().eq("id", id);
  if (error) return { status: "error", message: "Couldn't delete this banner." };
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { status: "ok" };
}

// ---------- Testimonials ----------

export async function upsertTestimonial(input: TestimonialInput): Promise<CmsActionResult> {
  await requireAdminRole("manager");
  if (!input.customerName.trim() || !input.quote.trim()) {
    return { status: "error", message: "Customer name and quote are required." };
  }
  const supabase = await createClient();

  const row = {
    customer_name: clean(input.customerName, 80),
    customer_role: clean(input.customerRole, 100) || null,
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    quote: clean(input.quote, 500),
    photo_url: clean(input.photoUrl, 500) || null,
    sort_order: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
    is_active: input.isActive,
  };

  const { error } = input.id
    ? await supabase.from("testimonials").update(row).eq("id", input.id)
    : await supabase.from("testimonials").insert(row);

  if (error) return { status: "error", message: "Couldn't save this testimonial. Please try again." };
  revalidatePath("/admin/cms");
  revalidatePath("/");
  return { status: "ok" };
}

export async function deleteTestimonial(id: string): Promise<CmsActionResult> {
  await requireAdminRole("manager");
  const supabase = await createClient();
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) return { status: "error", message: "Couldn't delete this testimonial." };
  revalidatePath("/admin/cms");
  revalidatePath("/");
  return { status: "ok" };
}

// ---------- Homepage sections (visibility/order) ----------

export async function updateHomepageSection(
  id: string,
  changes: { isActive?: boolean; sortOrder?: number }
): Promise<CmsActionResult> {
  await requireAdminRole("manager");
  const supabase = await createClient();

  const row: Record<string, unknown> = {};
  if (changes.isActive !== undefined) row.is_active = changes.isActive;
  if (changes.sortOrder !== undefined) row.sort_order = changes.sortOrder;

  const { error } = await supabase.from("homepage_sections").update(row).eq("id", id);
  if (error) return { status: "error", message: "Couldn't update this section." };
  revalidatePath("/admin/cms");
  revalidatePath("/");
  return { status: "ok" };
}

// ---------- Featured products ----------

/** Manager-only product lookup so an admin can pick something to feature — includes unpublished drafts, unlike the public catalog. */
export async function searchProductsForFeaturing(query: string): Promise<ProductSearchResult[]> {
  await requireAdminRole("manager");
  const supabase = await createClient();
  const q = clean(query, 80);
  if (!q) return [];

  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, images")
    .ilike("name", `%${q}%`)
    .limit(10);

  if (error || !data) return [];
  return data.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: (p.images as string[] | null)?.[0] ?? "/images/product-fallback.svg",
  }));
}

export async function addFeaturedProduct(productId: string): Promise<CmsActionResult> {
  await requireAdminRole("manager");
  const supabase = await createClient();
  const { error } = await supabase
    .from("featured_products")
    .upsert({ product_id: productId, is_active: true }, { onConflict: "product_id" });
  if (error) return { status: "error", message: "Couldn't feature this product." };
  revalidatePath("/admin/cms");
  revalidatePath("/");
  return { status: "ok" };
}

export async function removeFeaturedProduct(id: string): Promise<CmsActionResult> {
  await requireAdminRole("manager");
  const supabase = await createClient();
  const { error } = await supabase.from("featured_products").delete().eq("id", id);
  if (error) return { status: "error", message: "Couldn't remove this product." };
  revalidatePath("/admin/cms");
  revalidatePath("/");
  return { status: "ok" };
}

export async function toggleFeaturedProduct(id: string, isActive: boolean): Promise<CmsActionResult> {
  await requireAdminRole("manager");
  const supabase = await createClient();
  const { error } = await supabase.from("featured_products").update({ is_active: isActive }).eq("id", id);
  if (error) return { status: "error", message: "Couldn't update this product." };
  revalidatePath("/admin/cms");
  revalidatePath("/");
  return { status: "ok" };
}
