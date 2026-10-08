import { Gem, RefreshCw, Truck, ShieldCheck, Headset } from "lucide-react";

const REASONS = [
  { icon: Gem, title: "Premium Quality", desc: "Carefully sourced materials and craftsmanship in every pair." },
  { icon: RefreshCw, title: "Easy Exchange", desc: "Wrong size or fit? Exchange it, hassle-free." },
  { icon: Truck, title: "Fast Delivery", desc: "Quick, reliable delivery across Bangladesh." },
  { icon: ShieldCheck, title: "Secure Shopping", desc: "Your data and orders are always protected." },
  { icon: Headset, title: "Customer Support", desc: "Friendly help whenever you need it." },
];

export function WhyUs() {
  return (
    <section className="mt-16">
      <h2 className="mb-8 text-center text-2xl text-charcoal">Why Glam Soles BD</h2>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
        {REASONS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blush">
              <Icon size={20} className="text-charcoal" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-charcoal">{title}</p>
            <p className="mt-1 text-xs text-charcoal-soft">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
