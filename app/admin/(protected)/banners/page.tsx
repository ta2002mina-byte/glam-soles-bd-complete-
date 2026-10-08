import { requireAdminRole } from "@/lib/supabase/admin-guard";
import { getBannersForAdmin } from "@/lib/supabase/admin-queries";
import { BannerManager } from "@/components/admin/banner-manager";

export default async function AdminBannersPage() {
  await requireAdminRole("manager");
  const banners = await getBannersForAdmin();

  return (
    <div>
      <h1 className="font-display text-2xl text-charcoal">Banners</h1>
      <p className="mt-1 text-sm text-charcoal-soft">Hero, category, promotional and announcement banners.</p>
      <div className="mt-6">
        <BannerManager initialBanners={banners} />
      </div>
    </div>
  );
}
