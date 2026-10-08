"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  User,
  Package,
  Heart,
  Gift,
  MapPin,
  RotateCcw,
  Star,
  Ticket,
  Bell,
  Settings,
  LogOut,
  Loader2,
} from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/account", label: "Profile", icon: User, exact: true },
  { href: "/account/orders", label: "My Orders", icon: Package },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/rewards", label: "Rewards", icon: Gift },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/returns", label: "Returns & Exchanges", icon: RotateCcw },
  { href: "/account/reviews", label: "My Reviews", icon: Star },
  { href: "/account/coupons", label: "Coupons", icon: Ticket },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

export function AccountNav({ unreadNotifications = 0 }: { unreadNotifications?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    await signOutAction();
    router.push("/");
    router.refresh();
  }

  return (
    <nav aria-label="Account" className="md:w-56 md:shrink-0">
      <ul className="flex gap-1 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="shrink-0 md:shrink">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-[var(--radius-pill)] px-3.5 py-2 text-sm transition-colors md:rounded-lg",
                  isActive ? "bg-charcoal text-soft-white" : "text-charcoal-soft hover:bg-cream"
                )}
              >
                <Icon size={16} />
                {item.label}
                {item.href === "/account/notifications" && unreadNotifications > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] text-soft-white">
                    {unreadNotifications}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        <li className="shrink-0 md:mt-2 md:border-t md:border-line md:pt-2">
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 whitespace-nowrap rounded-[var(--radius-pill)] px-3.5 py-2 text-sm text-blush-deep transition-colors hover:bg-cream md:rounded-lg"
          >
            {signingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
            Logout
          </button>
        </li>
      </ul>
    </nav>
  );
}
