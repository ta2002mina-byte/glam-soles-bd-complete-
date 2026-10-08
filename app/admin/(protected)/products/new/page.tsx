import type { Metadata } from "next";
import { getAdminSession, roleAtLeast } from "@/lib/supabase/admin/guard";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { getAdminBrandOptions, getAdminCategoryOptions } from "@/lib/supabase/admin/queries";
import { ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = {
  title: "Add product — Glam Soles BD Admin",
  robots: { index: false, follow: false },
};

export default async function NewProductPage() {
  const session = await getAdminSession();
  if (!session || !roleAtLeast(session.role, "manager")) return <AccessRestricted requiredRole="manager" />;

  const [categories, brands] = await Promise.all([getAdminCategoryOptions(), getAdminBrandOptions()]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-charcoal">Add product</h1>
        <p className="text-sm text-charcoal-soft">Save the product first, then add color/size variants and stock.</p>
      </div>
      <ProductForm categories={categories} brands={brands} />
    </div>
  );
}
