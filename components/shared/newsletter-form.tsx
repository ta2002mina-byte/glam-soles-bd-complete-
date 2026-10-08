"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { subscribeToNewsletter } from "@/app/actions/newsletter";
import { cn } from "@/lib/utils";

type Status = "idle" | "success" | "duplicate" | "error";

export function NewsletterForm({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;

    startTransition(async () => {
      const result = await subscribeToNewsletter(email);
      if (result.status === "success") {
        setStatus("success");
        setMessage("You're subscribed! Watch your inbox for early access.");
        setEmail("");
      } else if (result.status === "duplicate") {
        setStatus("duplicate");
        setMessage("This email is already subscribed.");
      } else {
        setStatus("error");
        setMessage(result.message);
      }
    });
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="flex gap-2" noValidate>
        <Input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          aria-label="Email address"
          required
          disabled={isPending}
        />
        <Button type="submit" size="md" disabled={isPending}>
          {isPending ? "Joining…" : "Join"}
        </Button>
      </form>
      {message && (
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "mt-2 text-xs",
            status === "success" && "text-charcoal",
            status === "duplicate" && "text-charcoal-soft",
            status === "error" && "text-blush-deep"
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
