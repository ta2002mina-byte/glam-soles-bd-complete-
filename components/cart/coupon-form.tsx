"use client";

import { useState, type FormEvent } from "react";
import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { applyCouponPreview } from "@/app/actions/coupon";
import type { CouponPreview } from "@/types";
import { cn } from "@/lib/utils";

interface CouponFormProps {
  items: { variantId: string; quantity: number }[];
  onApplied: (preview: Extract<CouponPreview, { status: "valid" }>) => void;
  onCleared: () => void;
  appliedCode?: string;
}

export function CouponForm({ items, onApplied, onCleared, appliedCode }: CouponFormProps) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || status === "checking") return;

    setStatus("checking");
    setMessage(null);

    const result = await applyCouponPreview(code, items);

    if (result.status === "valid") {
      setStatus("idle");
      setMessage(result.message);
      onApplied(result);
    } else {
      setStatus("error");
      setMessage(result.message);
    }
  }

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between rounded-[var(--radius-card)] border border-gold/40 bg-gold-soft/15 px-3 py-2.5 text-sm">
        <span className="flex items-center gap-2 font-medium text-charcoal">
          <Check size={15} className="text-gold" /> {appliedCode} applied
        </span>
        <button
          type="button"
          onClick={() => {
            setCode("");
            setMessage(null);
            onCleared();
          }}
          aria-label="Remove coupon"
          className="text-charcoal-soft/60 hover:text-blush-deep"
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Coupon code"
          aria-label="Coupon code"
          className="flex-1 uppercase placeholder:normal-case"
        />
        <Button type="submit" variant="outline" size="md" disabled={status === "checking" || !code.trim()}>
          {status === "checking" ? "Checking…" : "Apply"}
        </Button>
      </div>
      {message && (
        <p role="alert" className={cn("text-xs", status === "error" ? "text-blush-deep" : "text-charcoal-soft")}>
          {message}
        </p>
      )}
    </form>
  );
}
