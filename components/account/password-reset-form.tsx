"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { requestPasswordReset } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function PasswordResetForm({ email }: { email: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage(null);
    const res = await requestPasswordReset({ email });
    setSubmitting(false);
    setMessage(res.status === "error" ? res.message : res.status === "confirmation_required" ? res.message : null);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-3 rounded-[var(--radius-card)] border border-line p-5">
      <p className="text-sm text-charcoal-soft">Send a password reset link to {email}.</p>
      {message && <p className="text-sm text-gold">{message}</p>}
      <Button type="submit" variant="outline" disabled={submitting}>
        {submitting ? <Loader2 size={16} className="animate-spin" /> : "Send reset link"}
      </Button>
    </form>
  );
}
