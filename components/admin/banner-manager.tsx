"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { deleteBanner, upsertBanner } from "@/app/actions/admin/cms";
import type { DbBanner, BannerPlacement } from "@/types/database";
import type { BannerInput } from "@/types/admin";

const PLACEMENTS: { value: BannerPlacement; label: string }[] = [
  { value: "hero", label: "Hero" },
  { value: "category", label: "Category" },
  { value: "promo", label: "Promotional" },
  { value: "homepage_section", label: "Homepage Section" },
  { value: "announcement", label: "Announcement Bar" },
];

function toInput(banner?: DbBanner): BannerInput {
  if (!banner) {
    return {
      placement: "promo",
      title: "",
      subtitle: "",
      desktopImageUrl: "",
      mobileImageUrl: "",
      ctaText: "",
      ctaLink: "",
      startsAt: "",
      endsAt: "",
      sortOrder: 0,
      isActive: true,
    };
  }
  return {
    id: banner.id,
    placement: banner.placement,
    title: banner.title ?? "",
    subtitle: banner.subtitle ?? "",
    desktopImageUrl: banner.desktop_image_url ?? "",
    mobileImageUrl: banner.mobile_image_url ?? "",
    ctaText: banner.cta_text ?? "",
    ctaLink: banner.cta_link ?? "",
    startsAt: banner.starts_at?.slice(0, 10) ?? "",
    endsAt: banner.ends_at?.slice(0, 10) ?? "",
    sortOrder: banner.sort_order,
    isActive: banner.is_active,
  };
}

export function BannerManager({ initialBanners }: { initialBanners: DbBanner[] }) {
  const router = useRouter();
  const [banners, setBanners] = useState(initialBanners);
  const [editing, setEditing] = useState<BannerInput | null>(null);

  const grouped = PLACEMENTS.map((p) => ({
    ...p,
    items: banners.filter((b) => b.placement === p.value).sort((a, b) => a.sort_order - b.sort_order),
  }));

  function handleSaved() {
    // revalidatePath already refreshed the server data for this route;
    // router.refresh() re-renders the server component tree with it
    // instead of a full page reload.
    setEditing(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this banner?")) return;
    const result = await deleteBanner(id);
    if (result.status === "ok") setBanners((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setEditing(toInput())}>
          <Plus size={15} /> Add Banner
        </Button>
      </div>

      <div className="space-y-6">
        {grouped.map((group) => (
          <div key={group.value}>
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-charcoal-soft">{group.label}</h2>
            {group.items.length === 0 ? (
              <p className="text-sm text-charcoal-soft/70">No banners in this placement.</p>
            ) : (
              <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-soft-white">
                {group.items.map((banner) => (
                  <div key={banner.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-cream">
                      {banner.desktop_image_url && (
                        <Image src={banner.desktop_image_url} alt="" fill sizes="80px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-charcoal">{banner.title || "(untitled)"}</p>
                      <p className="truncate text-xs text-charcoal-soft">{banner.subtitle}</p>
                    </div>
                    <Badge variant={banner.is_active ? "gold" : "outline"}>
                      {banner.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => setEditing(toInput(banner))}>
                      Edit
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDelete(banner.id)}
                      aria-label="Delete banner"
                      className="text-charcoal-soft/60 hover:text-blush-deep"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {banners.length === 0 && <EmptyState title="No banners yet." />}

      {editing && (
        <BannerFormDialog input={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}

function BannerFormDialog({
  input,
  onClose,
  onSaved,
}: {
  input: BannerInput;
  onClose: () => void;
  onSaved: (saved: BannerInput) => void;
}) {
  const [form, setForm] = useState(input);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setIsSaving(true);
    setError(null);
    const result = await upsertBanner(form);
    setIsSaving(false);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    onSaved(form);
  }

  return (
    <Dialog open onClose={onClose} title={form.id ? "Edit Banner" : "Add Banner"} className="max-w-lg">
      <h2 className="pr-8 font-display text-lg text-charcoal">{form.id ? "Edit Banner" : "Add Banner"}</h2>

      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal">Placement</label>
          <Select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value as BannerInput["placement"] })}>
            {PLACEMENTS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal">Title</label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal">Subtitle</label>
          <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
        </div>

        <ImageUploadField
          label="Desktop image"
          value={form.desktopImageUrl}
          onChange={(url) => setForm({ ...form, desktopImageUrl: url })}
          folder="banners"
        />
        <ImageUploadField
          label="Mobile image"
          value={form.mobileImageUrl}
          onChange={(url) => setForm({ ...form, mobileImageUrl: url })}
          folder="banners"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-charcoal">CTA text</label>
            <Input value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-charcoal">CTA link</label>
            <Input value={form.ctaLink} onChange={(e) => setForm({ ...form, ctaLink: e.target.value })} placeholder="/women" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-charcoal">Start date</label>
            <Input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-charcoal">End date</label>
            <Input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-charcoal">Active</span>
          <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} label="Active" />
        </div>

        {error && <p className="text-sm text-blush-deep">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save Banner"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
