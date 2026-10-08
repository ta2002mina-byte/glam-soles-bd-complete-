import { Accordion, type AccordionItemData } from "@/components/ui/accordion";
import type { Product } from "@/types";

export function ProductInfoSections({ product }: { product: Product }) {
  const items: AccordionItemData[] = [];

  items.push({
    id: "description",
    title: "Description",
    content: product.description ? (
      <p>{product.description}</p>
    ) : (
      <p className="text-charcoal-soft/60">No description available yet.</p>
    ),
  });

  if (product.materials) {
    items.push({ id: "materials", title: "Materials", content: <p>{product.materials}</p> });
  }

  if (product.features && product.features.length > 0) {
    items.push({
      id: "features",
      title: "Features",
      content: (
        <ul className="list-inside list-disc space-y-1">
          {product.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      ),
    });
  }

  items.push({
    id: "size-fit",
    title: "Size & Fit",
    content: product.sizeFitNotes ? (
      <p>{product.sizeFitNotes}</p>
    ) : (
      <p className="text-charcoal-soft/60">This style fits true to size.</p>
    ),
  });

  items.push({
    id: "shipping",
    title: "Shipping",
    content: (
      <p>
        Cash on Delivery is available across Bangladesh. Orders inside
        Dhaka typically arrive within 1–2 business days; outside Dhaka
        within 3–5 business days. Delivery fees are calculated at
        checkout.
      </p>
    ),
  });

  items.push({
    id: "return-exchange",
    title: "Return & Exchange",
    content: (
      <p>
        Not the right fit? Request a return or exchange from your account
        within 7 days of delivery for wrong size, wrong product, damaged
        or defective items.
      </p>
    ),
  });

  return <Accordion items={items} defaultOpenId="description" />;
}
