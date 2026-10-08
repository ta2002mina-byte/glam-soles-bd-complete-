"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Gift, Package, Percent, Sparkles, Truck } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatDateTime } from "@/lib/utils";
import type { NotificationSummary } from "@/types";

const TYPE_ICON: Record<NotificationSummary["type"], typeof Bell> = {
  order: Package,
  shipping: Truck,
  delivery: Truck,
  price_drop: Percent,
  back_in_stock: Sparkles,
  new_collection: Sparkles,
  coupon: Percent,
  reward: Gift,
  promotion: Sparkles,
};

export function NotificationList({ notifications }: { notifications: NotificationSummary[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function handleMarkRead(id: string) {
    if (pendingId) return;
    setPendingId(id);
    await markNotificationRead(id);
    setPendingId(null);
    router.refresh();
  }

  async function handleMarkAll() {
    if (markingAll) return;
    setMarkingAll(true);
    await markAllNotificationsRead();
    setMarkingAll(false);
    router.refresh();
  }

  if (notifications.length === 0) {
    return <EmptyState title="No notifications yet." description="Order, delivery and reward updates will show up here." />;
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="outline" onClick={handleMarkAll} disabled={markingAll}>
            Mark all as read
          </Button>
        </div>
      )}
      <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
        {notifications.map((n) => {
          const Icon = TYPE_ICON[n.type] ?? Bell;
          return (
            <div key={n.id} className={cn("flex items-start gap-3 p-4", !n.isRead && "bg-cream/40")}>
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream text-gold">
                <Icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", !n.isRead ? "font-semibold text-charcoal" : "text-charcoal")}>{n.title}</p>
                {n.body && <p className="mt-1 text-sm text-charcoal-soft">{n.body}</p>}
                <p className="mt-1 text-xs text-charcoal-soft">{formatDateTime(n.createdAt)}</p>
              </div>
              {!n.isRead && (
                <button
                  type="button"
                  onClick={() => handleMarkRead(n.id)}
                  disabled={pendingId === n.id}
                  aria-label="Mark as read"
                  className="shrink-0 rounded-full p-1.5 text-charcoal-soft hover:bg-cream hover:text-charcoal"
                >
                  <Check size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
