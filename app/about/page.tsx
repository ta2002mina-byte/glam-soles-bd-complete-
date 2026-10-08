import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About Us",
  description: "The story behind Glam Soles BD — premium footwear for women, men and kids in Bangladesh.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="container-boutique py-12 md:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-3xl text-charcoal md:text-4xl">About Glam Soles BD</h1>
        <p className="mt-4 text-sm leading-relaxed text-charcoal-soft md:text-base">
          Glam Soles BD is a premium footwear and accessories destination for women, men and kids across
          Bangladesh. We believe a great pair of shoes should feel as good as it looks — so every style in
          our collection is chosen for its craftsmanship, comfort and everyday wearability.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-charcoal-soft md:text-base">
          From editorial-ready heels to everyday sneakers and school shoes for the little ones, our goal is
          simple: help you step into your best vibe, every single day.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/women" className={cn(buttonVariants({ size: "lg" }))}>
            Shop the Collection
          </Link>
          <Link href="/contact" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
