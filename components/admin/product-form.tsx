"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUploader, ImageUrlFallbackButton } from "@/components/admin/image-uploader";
import { VariantsEditor } from "@/components/admin/variants-editor";
import { createProduct, updateProduct, deleteProduct, setProductFlags } from "@/app/actions/admin/products";
import type { AdminCategoryOption, AdminBrandOption, AdminProductDetail, AdminProductInput } from "@/types/admin";

interface ProductFormProps {
  categories: AdminCategoryOption[];
  brands: AdminBrandOption[];
  product?: AdminProductDetail;
}

function toListString(values: string[]): string {
  return values.join(", ");
}

function fromListString(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function ProductForm({ categories, brands, product }: ProductFormProps) {
  const router = useRouter();
  const isEditing = Boolean(product);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
  const [brandId, setBrandId] = useState(product?.brandId ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [materials, setMaterials] = useState(product?.materials ?? "");
  const [features, setFeatures] = useState(toListString(product?.features ?? []));
  const [sizeFitNotes, setSizeFitNotes] = useState(product?.sizeFitNotes ?? "");
  const [regularPrice, setRegularPrice] = useState(product?.regularPrice?.toString() ?? "");
  const [salePrice, setSalePrice] = useState(product?.salePrice?.toString() ?? "");
  const [costPrice, setCostPrice] = useState(product?.costPrice?.toString() ?? "");
  const [weightGrams, setWeightGrams] = useState(product?.weightGrams?.toString() ?? "");
  const [tags, setTags] = useState(toListString(product?.tags ?? []));
  const [seoTitle, setSeoTitle] = useState(product?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(product?.seoDescription ?? "");
  const [seoKeywords, setSeoKeywords] = useState(toListString(product?.seoKeywords ?? []));
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [videoUrl, setVideoUrl] = useState(product?.videoUrl ?? "");
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [isPublished, setIsPublished] = useState(product?.isPublished ?? false);

  function buildInput(): AdminProductInput {
    return {
      name,
      slug,
      sku,
      categoryId,
      brandId: brandId || null,
      description,
      materials,
      features: fromListString(features),
      sizeFitNotes,
      regularPrice: Number(regularPrice),
      salePrice: salePrice === "" ? null : Number(salePrice),
      costPrice: costPrice === "" ? null : Number(costPrice),
      weightGrams: weightGrams === "" ? null : Number(weightGrams),
      tags: fromListString(tags),
      seoTitle,
      seoDescription,
      seoKeywords: fromListString(seoKeywords),
      images,
      videoUrl,
      isActive,
      isPublished,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const input = buildInput();
      const result = isEditing && product ? await updateProduct(product.id, input) : await createProduct(input);

      if (result.status === "error") {
        setMessage({ type: "error", text: result.message });
        return;
      }

      if (!isEditing && "id" in result && result.id) {
        router.push(`/admin/products/${result.id}`);
        router.refresh();
        return;
      }

      setMessage({ type: "success", text: "Product saved." });
      router.refresh();
    });
  }

  function handleToggle(flag: "isActive" | "isPublished") {
    if (!product) return;
    startTransition(async () => {
      const next = flag === "isActive" ? !isActive : !isPublished;
      const result = await setProductFlags(product.id, { [flag]: next });
      if (result.status === "success") {
        if (flag === "isActive") setIsActive(next);
        else setIsPublished(next);
      } else {
        setMessage({ type: "error", text: result.message });
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!product) return;
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteProduct(product.id);
      if (result.status === "error") {
        setMessage({ type: "error", text: result.message });
        return;
      }
      router.push("/admin/products");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
          <h2 className="mb-4 font-display text-lg text-charcoal">Basic information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" htmlFor="p-name">
              <Input id="p-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Slug" htmlFor="p-slug" hint="Leave blank to auto-generate from the name">
              <Input id="p-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated" />
            </Field>
            <Field label="SKU" htmlFor="p-sku">
              <Input id="p-sku" required value={sku} onChange={(e) => setSku(e.target.value)} />
            </Field>
            <Field label="Category" htmlFor="p-category">
              <select
                id="p-category"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="h-11 w-full rounded-lg border border-line bg-soft-white px-4 text-sm text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentName ? `${c.parentName} / ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Brand" htmlFor="p-brand">
              <select
                id="p-brand"
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="h-11 w-full rounded-lg border border-line bg-soft-white px-4 text-sm text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <option value="">No brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Weight (grams)" htmlFor="p-weight">
              <Input id="p-weight" type="number" min={0} value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} />
            </Field>
          </div>

          <Field label="Description" htmlFor="p-description" className="mt-4">
            <textarea
              id="p-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-line bg-soft-white p-3 text-sm text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            />
          </Field>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Materials" htmlFor="p-materials">
              <Input id="p-materials" value={materials} onChange={(e) => setMaterials(e.target.value)} />
            </Field>
            <Field label="Size &amp; fit notes" htmlFor="p-fit">
              <Input id="p-fit" value={sizeFitNotes} onChange={(e) => setSizeFitNotes(e.target.value)} />
            </Field>
          </div>

          <Field label="Features (comma separated)" htmlFor="p-features" className="mt-4">
            <Input id="p-features" value={features} onChange={(e) => setFeatures(e.target.value)} placeholder="Cushioned insole, Breathable lining" />
          </Field>
        </section>

        <section className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
          <h2 className="mb-4 font-display text-lg text-charcoal">Pricing</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Regular price (৳)" htmlFor="p-regular">
              <Input id="p-regular" type="number" min={0} required value={regularPrice} onChange={(e) => setRegularPrice(e.target.value)} />
            </Field>
            <Field label="Sale price (৳)" htmlFor="p-sale">
              <Input id="p-sale" type="number" min={0} value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            </Field>
            <Field label="Cost price (৳)" htmlFor="p-cost" hint="Internal only, never shown to customers">
              <Input id="p-cost" type="number" min={0} value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
          <h2 className="mb-4 font-display text-lg text-charcoal">Images &amp; video</h2>
          <ImageUploader images={images} onChange={setImages} folder={product?.id ?? "drafts"} />
          <ImageUrlFallbackButton onAdd={(url) => setImages((prev) => [...prev, url])} />
          <Field label="Video URL (optional)" htmlFor="p-video" className="mt-4">
            <Input id="p-video" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" />
          </Field>
        </section>

        <section className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
          <h2 className="mb-4 font-display text-lg text-charcoal">SEO</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="SEO title" htmlFor="p-seo-title">
              <Input id="p-seo-title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
            </Field>
            <Field label="Tags (comma separated)" htmlFor="p-tags">
              <Input id="p-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
            </Field>
          </div>
          <Field label="SEO description" htmlFor="p-seo-desc" className="mt-4">
            <textarea
              id="p-seo-desc"
              rows={2}
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              className="w-full rounded-lg border border-line bg-soft-white p-3 text-sm text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            />
          </Field>
          <Field label="SEO keywords (comma separated)" htmlFor="p-seo-keywords" className="mt-4">
            <Input id="p-seo-keywords" value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} />
          </Field>
        </section>

        <section className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
          <h2 className="mb-4 font-display text-lg text-charcoal">Status</h2>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-charcoal">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm text-charcoal">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
              Published (visible on storefront)
            </label>
          </div>
        </section>

        {message && (
          <p className={`text-sm ${message.type === "error" ? "text-blush-deep" : "text-charcoal"}`} role={message.type === "error" ? "alert" : undefined}>
            {message.text}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : isEditing ? "Save changes" : "Create product"}
          </Button>
          {isEditing && product && (
            <>
              <Button type="button" variant="outline" disabled={pending} onClick={() => handleToggle("isActive")}>
                {isActive ? "Archive" : "Unarchive"}
              </Button>
              <Button type="button" variant="outline" disabled={pending} onClick={() => handleToggle("isPublished")}>
                {isPublished ? "Unpublish" : "Publish"}
              </Button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="ml-auto text-sm text-blush-deep hover:underline disabled:opacity-50"
              >
                Delete product
              </button>
            </>
          )}
        </div>
      </form>

      {isEditing && product && <VariantsEditor productId={product.id} initialVariants={product.variants} />}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-charcoal">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-charcoal-soft">{hint}</p>}
    </div>
  );
}
