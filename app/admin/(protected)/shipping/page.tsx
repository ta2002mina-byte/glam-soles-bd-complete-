import { requireAdminRole } from "@/lib/supabase/admin-guard";
import { getShippingSettingsForAdmin } from "@/lib/supabase/admin-queries";
import { ShippingSettingsForm } from "@/components/admin/shipping-settings-form";

export default async function AdminShippingPage() {
  await requireAdminRole("manager");
  const settings = await getShippingSettingsForAdmin();

  return (
    <div>
      <h1 className="font-display text-2xl text-charcoal">Shipping</h1>
      <p className="mt-1 text-sm text-charcoal-soft">
        Checkout and the cart page always read these fees live — nothing is hardcoded in the storefront.
      </p>
      <div className="mt-6 max-w-md">
        <ShippingSettingsForm settings={settings} />
      </div>
    </div>
  );
}
