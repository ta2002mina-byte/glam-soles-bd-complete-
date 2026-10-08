import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/account/profile-form";
import { getAccountProfile } from "@/lib/supabase/queries";
import { formatDate } from "@/lib/utils";

const TIER_VARIANT = {
  bronze: "outline",
  silver: "outline",
  gold: "gold",
  platinum: "charcoal",
} as const;

export default async function AccountProfilePage() {
  const profile = await getAccountProfile();
  if (!profile) return null; // layout already redirects signed-out visitors to the auth gate

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] bg-cream/60 p-5">
        <div>
          <p className="text-sm text-charcoal-soft">Welcome back,</p>
          <p className="text-lg text-charcoal">{profile.fullName || profile.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Badge variant={TIER_VARIANT[profile.membershipTier]}>
            {profile.membershipTier.charAt(0).toUpperCase() + profile.membershipTier.slice(1)}
          </Badge>
          <span className="text-sm text-charcoal-soft">{profile.rewardPoints} points</span>
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg text-charcoal">Profile details</h2>
        <p className="mt-1 text-sm text-charcoal-soft">Member since {formatDate(profile.createdAt)}</p>
        <div className="mt-4">
          <ProfileForm fullName={profile.fullName} phone={profile.phone} email={profile.email} />
        </div>
      </div>
    </div>
  );
}
