"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { updateProfile } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfileForm({ fullName, phone, email }: { fullName: string; phone: string; email: string }) {
  const [name, setName] = useState(fullName);
  const [phoneValue, setPhoneValue] = useState(phone);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setResult(null);

    const res = await updateProfile({ fullName: name, phone: phoneValue });
    setSubmitting(false);
    setResult(res.status);
    setMessage(res.status === "error" ? res.message : "Profile updated.");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-[var(--radius-card)] border border-line p-5">
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-charcoal-soft">Full name</span>
        <div className="mt-1.5">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-charcoal-soft">Phone number</span>
        <div className="mt-1.5">
          <Input value={phoneValue} onChange={(e) => setPhoneValue(e.target.value)} placeholder="01XXXXXXXXX" required />
        </div>
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-charcoal-soft">Email</span>
        <div className="mt-1.5">
          <Input value={email} disabled />
        </div>
      </label>

      {result === "error" && (
        <p role="alert" className="text-sm text-blush-deep">
          {message}
        </p>
      )}
      {result === "success" && <p className="text-sm text-gold">{message}</p>}

      <Button type="submit" disabled={submitting}>
        {submitting ? <Loader2 size={16} className="animate-spin" /> : "Save changes"}
      </Button>
    </form>
  );
}
