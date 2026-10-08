"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Heart, User, ShoppingBag, Menu, X, Home, LayoutGrid } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { SearchAutocomplete } from "@/components/product/search-autocomplete";

const NAV_LINKS = [
  { label: "Women", href: "/women" },
  { label: "Men", href: "/men" },
  { label: "Kids", href: "/kids" },
  { label: "Accessories", href: "/accessories" },
  { label: "New Arrivals", href: "/search?sort=newest" },
  { label: "Best Sellers", href: "/search?sort=best-selling" },
  { label: "Sale", href: "/search?discount=true" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { count, openDrawer } = useCart();
  const { ids } = useWishlist();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-soft-white/95 backdrop-blur">
      <div className="container-boutique flex h-16 items-center justify-between md:h-20">
        {/* Mobile: hamburger */}
        <button
          type="button"
          className="md:hidden"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={22} />
        </button>

        <Link href="/" className="font-display text-xl tracking-tight text-charcoal md:text-2xl">
          Glam Soles <span className="text-gold">BD</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-charcoal-soft transition-colors hover:text-charcoal"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button type="button" aria-label="Search" className="hidden md:block" onClick={() => setSearchOpen((v) => !v)}>
            <Search size={19} />
          </button>
          <Link href="/wishlist" aria-label="Wishlist" className="relative hidden md:block">
            <Heart size={19} />
            {ids.length > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-blush-deep text-[10px] text-soft-white">
                {ids.length}
              </span>
            )}
          </Link>
          <Link href="/account" aria-label="Account" className="hidden md:block">
            <User size={19} />
          </Link>
          <button
            type="button"
            onClick={openDrawer}
            aria-label={`Open cart${count > 0 ? ` (${count} items)` : ""}`}
            className="relative"
          >
            <ShoppingBag size={20} />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] text-soft-white">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Desktop search overlay */}
      {searchOpen && (
        <div className="hidden border-t border-line bg-soft-white px-4 py-4 md:block">
          <div className="container-boutique">
            <SearchAutocomplete autoFocus onNavigate={() => setSearchOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal/40 lg:hidden" role="dialog" aria-modal="true">
          <div className="flex h-full w-4/5 max-w-xs flex-col bg-soft-white p-6">
            <button
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="mb-6 self-end"
            >
              <X size={22} />
            </button>
            <nav className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-base text-charcoal"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile sticky bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-soft-white md:hidden"
        aria-label="Primary"
      >
        <Link href="/" className="flex flex-col items-center gap-1 py-2 text-[11px] text-charcoal-soft">
          <Home size={18} />
          Home
        </Link>
        <Link href="/#categories" className="flex flex-col items-center gap-1 py-2 text-[11px] text-charcoal-soft">
          <LayoutGrid size={18} />
          Categories
        </Link>
        <Link href="/search" className="flex flex-col items-center gap-1 py-2 text-[11px] text-charcoal-soft">
          <Search size={18} />
          Search
        </Link>
        <Link href="/wishlist" className="relative flex flex-col items-center gap-1 py-2 text-[11px] text-charcoal-soft">
          <Heart size={18} />
          {ids.length > 0 && (
            <span className="absolute right-3 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blush-deep text-[9px] text-soft-white">
              {ids.length}
            </span>
          )}
          Wishlist
        </Link>
        <button
          type="button"
          onClick={openDrawer}
          aria-label={`Open cart${count > 0 ? ` (${count} items)` : ""}`}
          className="relative flex flex-col items-center gap-1 py-2 text-[11px] text-charcoal-soft"
        >
          <ShoppingBag size={18} />
          {count > 0 && (
            <span className="absolute right-3 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gold text-[9px] text-soft-white">
              {count}
            </span>
          )}
          Cart
        </button>
      </nav>
    </header>
  );
}
