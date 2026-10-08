import type { Metadata } from "next";
import { Mail, MessageCircle, Phone } from "lucide-react";
import {
  SUPPORT_EMAIL,
  SUPPORT_MESSENGER_URL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL,
  SUPPORT_WHATSAPP_URL,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Glam Soles BD by phone, WhatsApp, Messenger or email.",
  alternates: { canonical: "/contact" },
};

const CHANNELS = [
  {
    icon: Phone,
    label: "Call Us",
    value: SUPPORT_PHONE_DISPLAY,
    href: `tel:${SUPPORT_PHONE_TEL}`,
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "Chat with us",
    href: SUPPORT_WHATSAPP_URL,
  },
  {
    icon: MessageCircle,
    label: "Messenger",
    value: "Chat with us",
    href: SUPPORT_MESSENGER_URL,
  },
  {
    icon: Mail,
    label: "Email",
    value: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
  },
];

export default function ContactPage() {
  return (
    <div className="container-boutique py-12 md:py-16">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-display text-3xl text-charcoal md:text-4xl">Contact Us</h1>
        <p className="mt-3 text-sm text-charcoal-soft">
          Questions about an order, sizing, or anything else? We&apos;re happy to help.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-xl gap-4 sm:grid-cols-2">
        {CHANNELS.map(({ icon: Icon, label, value, href }) => (
          <a
            key={label}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-soft-white p-5 transition-colors hover:bg-cream"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush">
              <Icon size={18} className="text-charcoal" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-medium text-charcoal">{label}</span>
              <span className="block text-xs text-charcoal-soft">{value}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
