import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminSession, roleAtLeast } from "@/lib/supabase/admin/guard";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { getAdminBrandOptions, getAdminCategoryOptions, getAdminProductById } from "@/lib/supabase/admin/queries";
import { ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = {
  title: "Edit product — Glam Soles BD Admin",
  robots: { index: false, follow: false },
};

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session || !roleAtLeast(session.role, "manager")) return <AccessRestricted requiredRole="manager" />;

  const { id } = await params;
  const [product, categories, brands] = await Promise.all([
    getAdminProductById(id),
    getAdminCategoryOptions(),
    getAdminBrandOptions(),
  ]);

  if (!product) notFound();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-charcoal">{product.name}</h1>
        <p className="text-sm text-charcoal-soft">SKU {product.sku}</p>
      </div>
      <ProductForm categories={categories} brands={brands} product={product} />
    </div>
  );
}
