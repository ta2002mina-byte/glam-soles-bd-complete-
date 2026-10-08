"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { addAddress, updateAddress } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Address, AddressInput, AddressLabel } from "@/types";

const LABELS: AddressLabel[] = ["home", "office", "other"];

export function AddressForm({ address, onSaved }: { address?: Address; onSaved: () => void }) {
  const [form, setForm] = useState<AddressInput>({
    label: address?.label ?? "home",
    fullName: address?.fullName ?? "",
    phone: address?.phone ?? "",
    division: address?.division ?? "",
    district: address?.district ?? "",
    area: address?.area ?? "",
    fullAddress: address?.fullAddress ?? "",
    deliveryNote: address?.deliveryNote ?? "",
    isDefault: address?.isDefault ?? false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof AddressInput>(key: K, value: AddressInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const res = address ? await updateAddress(address.id, form) : await addAddress(form);
    setSubmitting(false);
    if (res.status === "error") {
      setError(res.message);
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-charcoal-soft">Label</span>
        <div className="mt-1.5 flex gap-2">
          {LABELS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => set("label", label)}
              className={cn(
                "rounded-[var(--radius-pill)] border px-3.5 py-1.5 text-xs capitalize",
                form.label === label ? "border-charcoal bg-charcoal text-soft-white" : "border-line text-charcoal-soft"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Field label="Full name">
        <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
      </Field>
      <Field label="Phone number">
        <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="01XXXXXXXXX" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Division">
          <Input value={form.division} onChange={(e) => set("division", e.target.value)} required />
        </Field>
        <Field label="District">
          <Input value={form.district} onChange={(e) => set("district", e.target.value)} required />
        </Field>
      </div>
      <Field label="Area / Thana">
        <Input value={form.area} onChange={(e) => set("area", e.target.value)} required />
      </Field>
      <Field label="Full address">
        <textarea
          value={form.fullAddress}
          onChange={(e) => set("fullAddress", e.target.value)}
          rows={3}
          required
          className="w-full rounded-lg border border-line bg-soft-white p-3 text-sm text-charcoal outline-none focus-visible:border-gold"
        />
      </Field>
      <Field label="Delivery note (optional)">
        <Input value={form.deliveryNote ?? ""} onChange={(e) => set("deliveryNote", e.target.value)} />
      </Field>

      <label className="flex items-center gap-2 text-sm text-charcoal">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => set("isDefault", e.target.checked)}
          className="h-4 w-4 rounded border-line accent-gold"
        />
        Set as default address
      </label>

      {error && (
        <p role="alert" className="text-sm text-blush-deep">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? <Loader2 size={16} className="animate-spin" /> : address ? "Save changes" : "Add address"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-charcoal-soft">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
