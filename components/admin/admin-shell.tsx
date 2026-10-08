"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ClipboardList,
  Users,
  Menu,
  X,
  LogOut,
  RotateCcw,
  Layout as LayoutIcon,
  Image as ImageIcon,
  Truck,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminSignOut } from "@/app/actions/admin/auth";
import type { AdminSession } from "@/types/admin";

const NAV_ITEMS: { href: string; label: string; icon: typeof LayoutDashboard; minRole: "staff" | "manager" | "admin" }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, minRole: "staff" },
  { href: "/admin/products", label: "Products", icon: Package, minRole: "manager" },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes, minRole: "manager" },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList, minRole: "staff" },
  { href: "/admin/customers", label: "Customers", icon: Users, minRole: "manager" },
  { href: "/admin/returns", label: "Returns & Exchanges", icon: RotateCcw, minRole: "staff" },
  { href: "/admin/cms", label: "Homepage CMS", icon: LayoutIcon, minRole: "manager" },
  { href: "/admin/banners", label: "Banners", icon: ImageIcon, minRole: "manager" },
  { href: "/admin/shipping", label: "Shipping", icon: Truck, minRole: "manager" },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, minRole: "manager" },
];

const ROLE_ORDER = ["customer", "staff", "manager", "admin"];
function roleAtLeast(role: string, minimum: string) {
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(minimum);
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  minRole: "staff" | "manager" | "admin";
}

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string | null;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-charcoal text-soft-white" : "text-charcoal-soft hover:bg-cream"
            )}
          >
            <Icon size={18} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ session, children }: { session: AdminSession; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const visibleItems = NAV_ITEMS.filter((item) => roleAtLeast(session.role, item.minRole));

  function handleSignOut() {
    startTransition(async () => {
      await adminSignOut();
      router.replace("/admin/login");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen bg-ivory">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-soft-white md:flex">
        <div className="border-b border-line px-5 py-5">
          <Link href="/admin" className="font-display text-lg text-charcoal">
            Glam Soles <span className="text-gold">BD</span>
          </Link>
          <p className="mt-0.5 text-xs text-charcoal-soft">Admin panel</p>
        </div>
        <NavLinks items={visibleItems} pathname={pathname} />
        <div className="border-t border-line px-5 py-4">
          <p className="truncate text-sm font-medium text-charcoal">{session.fullName || session.email}</p>
          <p className="text-xs capitalize text-charcoal-soft">{session.role}</p>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={pending}
            className="mt-3 flex items-center gap-2 text-sm text-charcoal-soft hover:text-charcoal disabled:opacity-50"
          >
            <LogOut size={16} aria-hidden="true" />
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* Mobile topbar + drawer */}
      <div className="flex flex-1 flex-col md:hidden">
        <header className="flex items-center justify-between border-b border-line bg-soft-white px-4 py-3">
          <button type="button" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
          <span className="font-display text-lg text-charcoal">
            Glam Soles <span className="text-gold">BD</span>
          </span>
          <div className="w-[22px]" aria-hidden="true" />
        </header>
        {mobileOpen && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-charcoal/50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
            <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-soft-white shadow-xl">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <span className="font-display text-lg text-charcoal">Admin panel</span>
                <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <NavLinks items={visibleItems} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
              <div className="border-t border-line px-5 py-4">
                <p className="truncate text-sm font-medium text-charcoal">{session.fullName || session.email}</p>
                <p className="text-xs capitalize text-charcoal-soft">{session.role}</p>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={pending}
                  className="mt-3 flex items-center gap-2 text-sm text-charcoal-soft hover:text-charcoal disabled:opacity-50"
                >
                  <LogOut size={16} aria-hidden="true" />
                  {pending ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </div>

      {/* Desktop content */}
      <main className="hidden flex-1 p-6 md:block lg:p-8">{children}</main>
    </div>
  );
}
