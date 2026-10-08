import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Size Guide",
  description: "Footwear size charts for women, men and kids at Glam Soles BD.",
  alternates: { canonical: "/size-guide" },
};

const WOMEN_SIZES = [
  { eu: 36, uk: 3, foot_cm: 23 },
  { eu: 37, uk: 4, foot_cm: 23.5 },
  { eu: 38, uk: 5, foot_cm: 24.5 },
  { eu: 39, uk: 6, foot_cm: 25 },
  { eu: 40, uk: 7, foot_cm: 25.5 },
  { eu: 41, uk: 8, foot_cm: 26.5 },
];

const MEN_SIZES = [
  { eu: 40, uk: 6, foot_cm: 25 },
  { eu: 41, uk: 7, foot_cm: 25.5 },
  { eu: 42, uk: 8, foot_cm: 26.5 },
  { eu: 43, uk: 9, foot_cm: 27.5 },
  { eu: 44, uk: 10, foot_cm: 28 },
  { eu: 45, uk: 11, foot_cm: 29 },
];

function SizeTable({ title, rows }: { title: string; rows: { eu: number; uk: number; foot_cm: number }[] }) {
  return (
    <div>
      <h2 className="mb-3 text-lg text-charcoal">{title}</h2>
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line">
        <table className="w-full min-w-[320px] text-left text-sm">
          <thead className="bg-cream text-charcoal-soft">
            <tr>
              <th scope="col" className="p-3 font-medium">
                EU
              </th>
              <th scope="col" className="p-3 font-medium">
                UK
              </th>
              <th scope="col" className="p-3 font-medium">
                Foot length (cm)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.eu}>
                <td className="p-3 text-charcoal">{row.eu}</td>
                <td className="p-3 text-charcoal">{row.uk}</td>
                <td className="p-3 text-charcoal">{row.foot_cm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SizeGuidePage() {
  return (
    <div className="container-boutique py-12 md:py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl text-charcoal">Size Guide</h1>
        <p className="mt-3 text-sm leading-relaxed text-charcoal-soft">
          To find your size, measure your foot length from heel to toe in the evening (feet are
          typically at their largest then) and match it to the closest size below. If you&apos;re
          between sizes, we recommend sizing up.
        </p>

        <div className="mt-8 space-y-10">
          <SizeTable title="Women's Sizes" rows={WOMEN_SIZES} />
          <SizeTable title="Men's Sizes" rows={MEN_SIZES} />
        </div>

        <p className="mt-8 text-xs text-charcoal-soft">
          Kids&apos; sizing varies by style — please check the size chart on each individual product
          page. If you&apos;re unsure, our support team is happy to help you pick the right size.
        </p>
      </div>
    </div>
  );
}
