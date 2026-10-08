"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { requestReturn } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReturnEligibleItem, ReturnReasonUi } from "@/types";

const REASONS: { value: ReturnReasonUi; label: string }[] = [
  { value: "wrong_size", label: "Wrong size" },
  { value: "wrong_product", label: "Wrong product" },
  { value: "damaged", label: "Damaged" },
  { value: "defective", label: "Defective" },
  { value: "other", label: "Other" },
];

export function ReturnRequestForm({ eligibleItems }: { eligibleItems: ReturnEligibleItem[] }) {
  const router = useRouter();
  const [orderItemId, setOrderItemId] = useState(eligibleItems[0]?.orderItemId ?? "");
  const [reason, setReason] = useState<ReturnReasonUi>("wrong_size");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<{ path: string; previewUrl: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (eligibleItems.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] bg-cream/60 p-4 text-sm text-charcoal-soft">
        No delivered items are currently eligible for a return or exchange.
      </p>
    );
  }

  if (success) {
    return (
      <p className="rounded-[var(--radius-card)] bg-cream/60 p-4 text-sm text-charcoal-soft">
        Your request has been submitted. We&apos;ll review it and update the status below.
      </p>
    );
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("returns").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) return;
      setPhoto({ path, previewUrl: URL.createObjectURL(file) });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function removePhoto() {
    if (!photo) return;
    const supabase = createClient();
    await supabase.storage.from("returns").remove([photo.path]);
    setPhoto(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const res = await requestReturn({ orderItemId, reason, description, photoPath: photo?.path });
    setSubmitting(false);
    if (res.status === "error") {
      setError(res.message);
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[var(--radius-card)] bg-cream/60 p-5">
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-charcoal-soft">Item</span>
        <select
          value={orderItemId}
          onChange={(e) => setOrderItemId(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-lg border border-line bg-soft-white px-4 text-sm text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {eligibleItems.map((item) => (
            <option key={item.orderItemId} value={item.orderItemId}>
              {item.productName} — {item.color} / {item.size} (Order {item.orderNumber})
            </option>
          ))}
        </select>
      </label>

      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-charcoal-soft">Reason</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReason(r.value)}
              className={cn(
                "rounded-[var(--radius-pill)] border px-3.5 py-1.5 text-xs",
                reason === r.value ? "border-charcoal bg-charcoal text-soft-white" : "border-line text-charcoal-soft"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-charcoal-soft">Description (optional)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={1000}
          className="mt-1.5 w-full rounded-[var(--radius-card)] border border-line bg-soft-white p-3 text-sm text-charcoal outline-none focus-visible:border-gold"
          placeholder="Tell us more about the issue."
        />
      </label>

      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-charcoal-soft">Photo (optional)</span>
        <div className="mt-1.5">
          {photo ? (
            <div className="relative h-16 w-16 overflow-hidden rounded-[var(--radius-card)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not eligible for next/image optimization */}
              <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={removePhoto}
                aria-label="Remove photo"
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-charcoal/80 text-soft-white"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line text-charcoal-soft">
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
              <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} disabled={uploading} />
            </label>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-blush-deep">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting || uploading}>
        {submitting ? <Loader2 size={16} className="animate-spin" /> : "Submit request"}
      </Button>
    </form>
  );
}
