"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveVariants, deleteVariant } from "@/app/actions/admin/products";
import type { AdminVariantInput } from "@/types/admin";

interface VariantsEditorProps {
  productId: string | null;
  initialVariants: AdminVariantInput[];
}

function emptyVariant(): AdminVariantInput {
  return { color: "", size: "", sku: "", priceOverride: null, stock: 0, lowStockThreshold: 5 };
}

export function VariantsEditor({ productId, initialVariants }: VariantsEditorProps) {
  const [variants, setVariants] = useState<AdminVariantInput[]>(
    initialVariants.length > 0 ? initialVariants : [emptyVariant()]
  );
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function updateVariant(index: number, patch: Partial<AdminVariantInput>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function addRow() {
    setVariants((prev) => [...prev, emptyVariant()]);
  }

  function removeRow(index: number) {
    const variant = variants[index];
    if (variant.id && productId) {
      startTransition(async () => {
        const result = await deleteVariant(variant.id!, productId);
        if (result.status === "error") {
          setMessage({ type: "error", text: result.message });
          return;
        }
        setVariants((prev) => prev.filter((_, i) => i !== index));
      });
    } else {
      setVariants((prev) => prev.filter((_, i) => i !== index));
    }
  }

  function handleSave() {
    if (!productId) {
      setMessage({ type: "error", text: "Save the product first, then add variants." });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await saveVariants(productId, variants);
      setMessage(
        result.status === "success"
          ? { type: "success", text: "Variants saved." }
          : { type: "error", text: result.message }
      );
    });
  }

  const totalStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg text-charcoal">Variants &amp; Inventory</h2>
          <p className="text-xs text-charcoal-soft">Color + size stock mapping. Total stock: {totalStock}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus size={14} aria-hidden="true" />
          Add row
        </Button>
      </div>

      {message && (
        <p className={`mb-3 text-sm ${message.type === "error" ? "text-blush-deep" : "text-charcoal"}`}>{message.text}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-charcoal-soft">
            <tr>
              <th className="pb-2 pr-2 font-medium">Color</th>
              <th className="pb-2 pr-2 font-medium">Size</th>
              <th className="pb-2 pr-2 font-medium">SKU</th>
              <th className="pb-2 pr-2 font-medium">Price override</th>
              <th className="pb-2 pr-2 font-medium">Stock</th>
              <th className="pb-2 pr-2 font-medium">Low-stock at</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {variants.map((variant, index) => (
              <tr key={variant.id ?? `new-${index}`} className="border-t border-line">
                <td className="py-2 pr-2">
                  <Input
                    value={variant.color}
                    onChange={(e) => updateVariant(index, { color: e.target.value })}
                    placeholder="Black"
                    className="h-9"
                  />
                </td>
                <td className="py-2 pr-2">
                  <Input
                    value={variant.size}
                    onChange={(e) => updateVariant(index, { size: e.target.value })}
                    placeholder="38"
                    className="h-9 w-20"
                  />
                </td>
                <td className="py-2 pr-2">
                  <Input
                    value={variant.sku}
                    onChange={(e) => updateVariant(index, { sku: e.target.value })}
                    placeholder="GSB-001-BLK-38"
                    className="h-9"
                  />
                </td>
                <td className="py-2 pr-2">
                  <Input
                    type="number"
                    min={0}
                    value={variant.priceOverride ?? ""}
                    onChange={(e) => updateVariant(index, { priceOverride: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="—"
                    className="h-9 w-28"
                  />
                </td>
                <td className="py-2 pr-2">
                  <Input
                    type="number"
                    min={0}
                    value={variant.stock}
                    onChange={(e) => updateVariant(index, { stock: Number(e.target.value) })}
                    className="h-9 w-20"
                  />
                </td>
                <td className="py-2 pr-2">
                  <Input
                    type="number"
                    min={0}
                    value={variant.lowStockThreshold}
                    onChange={(e) => updateVariant(index, { lowStockThreshold: Number(e.target.value) })}
                    className="h-9 w-20"
                  />
                </td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    aria-label="Remove variant"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-charcoal-soft hover:bg-cream hover:text-blush-deep"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button type="button" onClick={handleSave} disabled={pending} className="mt-4">
        {pending ? "Saving…" : "Save variants"}
      </Button>
    </div>
  );
}
