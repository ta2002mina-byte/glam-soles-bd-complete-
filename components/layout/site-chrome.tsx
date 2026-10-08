"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface SiteChromeProps {
  announcementBar: ReactNode;
  header: ReactNode;
  footer: ReactNode;
  cartDrawer: ReactNode;
  children: ReactNode;
}

/**
 * The admin panel (/admin/**) renders its own shell (sidebar/topbar —
 * see components/admin/admin-shell.tsx) and must not show the storefront
 * announcement bar, header, footer, or cart drawer. Server Components
 * (AnnouncementBar, Header, Footer) are rendered by the root layout and
 * passed in as pre-rendered nodes so this client component only has to
 * decide whether to show them — it never imports server-only data
 * fetching itself.
 */
export function SiteChrome({ announcementBar, header, footer, cartDrawer, children }: SiteChromeProps) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      {announcementBar}
      {header}
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      {footer}
      {cartDrawer}
    </>
  );
}
