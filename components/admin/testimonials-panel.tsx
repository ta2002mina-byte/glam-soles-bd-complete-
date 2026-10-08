"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Star, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { deleteTestimonial, upsertTestimonial } from "@/app/actions/admin/cms";
import type { DbTestimonial } from "@/types/database";
import type { TestimonialInput } from "@/types/admin";

function toInput(t?: DbTestimonial): TestimonialInput {
  if (!t) {
    return { customerName: "", customerRole: "", rating: 5, quote: "", photoUrl: "", sortOrder: 0, isActive: true };
  }
  return {
    id: t.id,
    customerName: t.customer_name,
    customerRole: t.customer_role ?? "",
    rating: t.rating,
    quote: t.quote,
    photoUrl: t.photo_url ?? "",
    sortOrder: t.sort_order,
    isActive: t.is_active,
  };
}

export function TestimonialsPanel({ initialTestimonials }: { initialTestimonials: DbTestimonial[] }) {
  const router = useRouter();
  const [testimonials, setTestimonials] = useState(initialTestimonials);
  const [editing, setEditing] = useState<TestimonialInput | null>(null);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this testimonial?")) return;
    const result = await deleteTestimonial(id);
    if (result.status === "ok") setTestimonials((prev) => prev.filter((t) => t.id !== id));
  }

  function handleSaved() {
    setEditing(null);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setEditing(toInput())}>
          <Plus size={15} /> Add Testimonial
        </Button>
      </div>

      {testimonials.length === 0 ? (
        <EmptyState title="No testimonials yet." />
      ) : (
        <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-soft-white">
          {testimonials.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-cream">
                {t.photo_url && <Image src={t.photo_url} alt="" fill sizes="40px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-charcoal">{t.customer_name}</p>
                <p className="truncate text-xs text-charcoal-soft">{t.quote}</p>
              </div>
              <span className="flex items-center gap-0.5 text-gold">
                <Star size={13} className="fill-gold" /> {t.rating}
              </span>
              <Badge variant={t.is_active ? "gold" : "outline"}>{t.is_active ? "Active" : "Inactive"}</Badge>
              <Button size="sm" variant="outline" onClick={() => setEditing(toInput(t))}>
                Edit
              </Button>
              <button
                type="button"
                onClick={() => handleDelete(t.id)}
                aria-label={`Delete testimonial from ${t.customer_name}`}
                className="text-charcoal-soft/60 hover:text-blush-deep"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && <TestimonialFormDialog input={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
    </div>
  );
}

function TestimonialFormDialog({
  input,
  onClose,
  onSaved,
}: {
  input: TestimonialInput;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(input);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setIsSaving(true);
    setError(null);
    const result = await upsertTestimonial(form);
    setIsSaving(false);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    onSaved();
  }

  return (
    <Dialog open onClose={onClose} title={form.id ? "Edit Testimonial" : "Add Testimonial"} className="max-w-lg">
      <h2 className="pr-8 font-display text-lg text-charcoal">{form.id ? "Edit Testimonial" : "Add Testimonial"}</h2>

      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-charcoal">Customer name</label>
            <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-charcoal">Role / location (optional)</label>
            <Input
              value={form.customerRole}
              onChange={(e) => setForm({ ...form, customerRole: e.target.value })}
              placeholder="Verified Buyer, Dhaka"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal">Quote</label>
          <Textarea value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} rows={3} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal">Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setForm({ ...form, rating: n })}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
              >
                <Star size={20} className={n <= form.rating ? "fill-gold text-gold" : "fill-transparent text-line"} />
              </button>
            ))}
          </div>
        </div>

        <ImageUploadField
          label="Photo (optional)"
          value={form.photoUrl}
          onChange={(url) => setForm({ ...form, photoUrl: url })}
          folder="testimonials"
        />

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
            {isSaving ? "Saving…" : "Save Testimonial"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
