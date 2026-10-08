import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/supabase/admin/guard";
import { AdminLoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Admin sign in — Glam Soles BD",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-card)] border border-line bg-soft-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <p className="font-display text-2xl text-charcoal">
            Glam Soles <span className="text-gold">BD</span>
          </p>
          <p className="mt-1 text-sm text-charcoal-soft">Admin panel sign in</p>
        </div>
        <AdminLoginForm />
        <p className="mt-6 text-center text-xs text-charcoal-soft">
          Restricted to Admin, Manager, and Staff accounts.
        </p>
      </div>
    </div>
  );
}
