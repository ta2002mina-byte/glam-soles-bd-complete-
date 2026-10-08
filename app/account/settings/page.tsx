import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { PasswordResetForm } from "@/components/account/password-reset-form";
import { getAccountProfile } from "@/lib/supabase/queries";

export const metadata: Metadata = { title: "Settings — Glam Soles BD" };

export default async function AccountSettingsPage() {
  const profile = await getAccountProfile();
  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg text-charcoal">Password</h2>
        <div className="mt-4">
          <PasswordResetForm email={profile.email} />
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg text-charcoal">Account status</h2>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant={profile.accountStatus === "active" ? "gold" : "outline"} className="capitalize">
            {profile.accountStatus}
          </Badge>
          <span className="text-sm text-charcoal-soft">
            {profile.accountStatus === "active"
              ? "Your account is in good standing."
              : "Contact support for help with your account."}
          </span>
        </div>
      </div>
    </div>
  );
}
