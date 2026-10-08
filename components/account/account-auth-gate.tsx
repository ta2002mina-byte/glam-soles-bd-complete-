"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { signInWithPassword, signUpWithPassword, requestPasswordReset } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Mode = "sign-in" | "sign-up" | "forgot";

export function AccountAuthGate() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return; // duplicate-click prevention
    setSubmitting(true);
    setError(null);
    setNotice(null);

    if (mode === "forgot") {
      const res = await requestPasswordReset({ email });
      setSubmitting(false);
      if (res.status === "error") setError(res.message);
      else if (res.status === "confirmation_required") setNotice(res.message);
      return;
    }

    const res =
      mode === "sign-up"
        ? await signUpWithPassword({ fullName, phone, email, password })
        : await signInWithPassword({ email, password });

    setSubmitting(false);
    if (res.status === "error") {
      setError(res.message);
    } else if (res.status === "confirmation_required") {
      setNotice(res.message);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="container-boutique flex justify-center py-14 md:py-20">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-line bg-soft-white p-6 md:p-8">
        <h1 className="text-center text-2xl text-charcoal">
          {mode === "sign-up" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Sign in"}
        </h1>
        <p className="mt-2 text-center text-sm text-charcoal-soft">
          {mode === "sign-up"
            ? "Track orders, save addresses and earn Glam Rewards."
            : mode === "forgot"
              ? "We'll email you a link to reset your password."
              : "Access your orders, wishlist, addresses and rewards."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "sign-up" && (
            <>
              <Field label="Full name">
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
              </Field>
              <Field label="Phone number">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  required
                  autoComplete="tel"
                />
              </Field>
            </>
          )}
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Field>
          {mode !== "forgot" && (
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              />
            </Field>
          )}

          {error && (
            <p role="alert" className="text-sm text-blush-deep">
              {error}
            </p>
          )}
          {notice && <p className="text-sm text-gold">{notice}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : mode === "sign-up" ? (
              "Create account"
            ) : mode === "forgot" ? (
              "Send reset link"
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-2 text-sm text-charcoal-soft">
          {mode === "sign-in" && (
            <>
              <button type="button" onClick={() => setMode("forgot")} className="underline underline-offset-2">
                Forgot your password?
              </button>
              <p>
                New here?{" "}
                <button
                  type="button"
                  onClick={() => setMode("sign-up")}
                  className={cn("font-medium text-charcoal underline underline-offset-2")}
                >
                  Create an account
                </button>
              </p>
            </>
          )}
          {mode !== "sign-in" && (
            <button type="button" onClick={() => setMode("sign-in")} className="underline underline-offset-2">
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
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
