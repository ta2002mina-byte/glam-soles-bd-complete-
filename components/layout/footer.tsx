import Link from "next/link";
import { Gem, MessageCircle, Phone, RefreshCw, ShieldCheck, Truck, Wallet } from "lucide-react";
import { NewsletterForm } from "@/components/shared/newsletter-form";
import {
  SUPPORT_MESSENGER_URL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL,
  SUPPORT_WHATSAPP_URL,
} from "@/lib/site-config";

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "Secure Checkout" },
  { icon: Truck, label: "Reliable Delivery" },
  { icon: RefreshCw, label: "Easy Exchange" },
  { icon: Gem, label: "Customer Support" },
  { icon: Wallet, label: "Cash on Delivery" },
];

const COLUMNS = [
  {
    heading: "Shop",
    links: [
      { label: "Women", href: "/women" },
      { label: "Men", href: "/men" },
      { label: "Kids", href: "/kids" },
      { label: "Accessories", href: "/accessories" },
      { label: "New Arrivals", href: "/search?sort=newest" },
      { label: "Best Sellers", href: "/search?sort=best-selling" },
      { label: "Sale", href: "/search?discount=true" },
    ],
  },
  {
    heading: "Customer Care",
    links: [
      { label: "Track Order", href: "/track-order" },
      { label: "Shipping Policy", href: "/shipping-policy" },
      { label: "Returns & Exchange", href: "/returns" },
      { label: "Size Guide", href: "/size-guide" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-cream pb-24 pt-12 md:pb-12">
      {/* Trust bar */}
      <div className="container-boutique mb-10 grid grid-cols-2 gap-6 border-b border-line pb-10 md:grid-cols-5">
        {TRUST_BADGES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon size={18} className="shrink-0 text-charcoal" aria-hidden="true" />
            <span className="text-xs font-medium text-charcoal">{label}</span>
          </div>
        ))}
      </div>

      <div className="container-boutique grid grid-cols-1 gap-10 md:grid-cols-4">
        <div>
          <p className="font-display text-lg text-charcoal">
            Glam Soles <span className="text-gold">BD</span>
          </p>
          <p className="mt-2 max-w-xs text-sm text-charcoal-soft">
            Premium footwear for every journey — style, comfort, confidence.
          </p>

          {/* Support: Call / WhatsApp / Messenger */}
          <div className="mt-5 space-y-2">
            <a
              href={`tel:${SUPPORT_PHONE_TEL}`}
              className="flex items-center gap-2 text-sm text-charcoal-soft hover:text-charcoal"
            >
              <Phone size={16} aria-hidden="true" />
              {SUPPORT_PHONE_DISPLAY}
            </a>
            <a
              href={SUPPORT_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-charcoal-soft hover:text-charcoal"
            >
              <MessageCircle size={16} aria-hidden="true" />
              WhatsApp
            </a>
            <a
              href={SUPPORT_MESSENGER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-charcoal-soft hover:text-charcoal"
            >
              <MessageCircle size={16} aria-hidden="true" />
              Messenger
            </a>
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <p className="mb-3 text-sm font-medium text-charcoal">{col.heading}</p>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-charcoal-soft hover:text-charcoal">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <p className="mb-3 text-sm font-medium text-charcoal">Newsletter</p>
          <p className="mb-3 text-sm text-charcoal-soft">
            Get early access to new arrivals and offers.
          </p>
          <NewsletterForm />
        </div>
      </div>

      <div className="container-boutique mt-10 border-t border-line pt-6 text-xs text-charcoal-soft/70">
        © {new Date().getFullYear()} Glam Soles BD. All rights reserved.
      </div>
    </footer>
  );
}
