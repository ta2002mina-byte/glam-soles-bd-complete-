import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/supabase/queries";
import { AccountAuthGate } from "@/components/account/account-auth-gate";
import { AccountNav } from "@/components/account/account-nav";

export const metadata: Metadata = {
  title: "My Account — Glam Soles BD",
  description: "Manage your Glam Soles BD orders, wishlist, addresses, rewards and account settings.",
};

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <AccountAuthGate />;
  }

  const notifications = await getNotifications();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="container-boutique py-8 md:py-12">
      <h1 className="text-2xl text-charcoal md:text-3xl">My Account</h1>
      <div className="mt-6 flex flex-col gap-6 md:flex-row md:gap-10">
        <AccountNav unreadNotifications={unreadCount} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
