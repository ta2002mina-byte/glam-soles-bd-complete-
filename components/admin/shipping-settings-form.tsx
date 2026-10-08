"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updateShippingSettings } from "@/app/actions/admin/shipping";
import type { DbShippingSettings } from "@/types/database";

export function ShippingSettingsForm({ settings }: { settings: DbShippingSettings }) {
  const [insideDhakaFee, setInsideDhakaFee] = useState(String(settings.inside_dhaka_fee));
  const [outsideDhakaFee, setOutsideDhakaFee] = useState(String(settings.outside_dhaka_fee));
  const [expressFee, setExpressFee] = useState(String(settings.express_fee));
  const [expressEnabled, setExpressEnabled] = useState(settings.express_enabled);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(
    settings.free_shipping_threshold !== null ? String(settings.free_shipping_threshold) : ""
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setStatus("saving");
    setError(null);
    const result = await updateShippingSettings({
      insideDhakaFee: Number(insideDhakaFee) || 0,
      outsideDhakaFee: Number(outsideDhakaFee) || 0,
      expressFee: Number(expressFee) || 0,
      expressEnabled,
      freeShippingThreshold: freeShippingThreshold.trim() === "" ? null : Number(freeShippingThreshold),
    });
    if (result.status === "error") {
      setStatus("error");
      setError(result.message);
      return;
    }
    setStatus("saved");
    window.setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="space-y-5 rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-charcoal">Inside Dhaka fee (৳)</label>
        <Input type="number" min={0} value={insideDhakaFee} onChange={(e) => setInsideDhakaFee(e.target.value)} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-charcoal">Outside Dhaka fee (৳)</label>
        <Input type="number" min={0} value={outsideDhakaFee} onChange={(e) => setOutsideDhakaFee(e.target.value)} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-charcoal">Express fee (৳)</label>
        <Input type="number" min={0} value={expressFee} onChange={(e) => setExpressFee(e.target.value)} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-charcoal">Enable express delivery</span>
        <Switch checked={expressEnabled} onCheckedChange={setExpressEnabled} label="Enable express delivery" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-charcoal">
          Free shipping threshold (৳, optional)
        </label>
        <Input
          type="number"
          min={0}
          placeholder="No threshold"
          value={freeShippingThreshold}
          onChange={(e) => setFreeShippingThreshold(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-blush-deep">{error}</p>}

      <Button onClick={handleSave} disabled={status === "saving"}>
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save Changes"}
      </Button>
    </div>
  );
}
