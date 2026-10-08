import type { Metadata } from "next";
import { getNotifications } from "@/lib/supabase/queries";
import { NotificationList } from "@/components/account/notification-list";

export const metadata: Metadata = { title: "Notifications — Glam Soles BD" };

export default async function AccountNotificationsPage() {
  const notifications = await getNotifications();
  return <NotificationList notifications={notifications} />;
}
