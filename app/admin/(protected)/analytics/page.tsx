import Link from "next/link";
import { requireAdminRole } from "@/lib/supabase/admin-guard";
import { getAnalyticsSummary } from "@/lib/supabase/admin-queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatBDT } from "@/lib/utils";

type RangeKey = "today" | "7d" | "30d" | "3m" | "1y" | "custom";

const PRESETS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "3m", label: "3M" },
  { key: "1y", label: "1Y" },
  { key: "custom", label: "Custom" },
];

function resolveRange(range: RangeKey, from?: string, to?: string): { fromISO: string; toISO: string } {
  const now = new Date();
  const toISO = now.toISOString();

  if (range === "custom" && from && to) {
    return { fromISO: new Date(from).toISOString(), toISO: new Date(`${to}T23:59:59`).toISOString() };
  }

  const start = new Date(now);
  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "3m":
      start.setMonth(start.getMonth() - 3);
      break;
    case "1y":
      start.setFullYear(start.getFullYear() - 1);
      break;
  }
  return { fromISO: start.toISOString(), toISO };
}

interface PageProps {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  await requireAdminRole("manager");
  const params = await searchParams;
  const range = (PRESETS.some((p) => p.key === params.range) ? params.range : "30d") as RangeKey;
  const { fromISO, toISO } = resolveRange(range, params.from, params.to);

  const summary = await getAnalyticsSummary(fromISO, toISO);
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  return (
    <div>
      <h1 className="font-display text-2xl text-charcoal">Analytics</h1>
      <p className="mt-1 text-sm text-charcoal-soft">
        {new Date(fromISO).toLocaleDateString("en-BD")} – {new Date(toISO).toLocaleDateString("en-BD")}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <Link
            key={p.key}
            href={`/admin/analytics?range=${p.key}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              range === p.key ? "border-charcoal bg-charcoal text-soft-white" : "border-line text-charcoal-soft hover:bg-cream"
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {range === "custom" && (
        <form className="mt-3 flex flex-wrap items-end gap-2" action="/admin/analytics">
          <input type="hidden" name="range" value="custom" />
          <div>
            <label className="mb-1 block text-xs text-charcoal-soft">From</label>
            <Input type="date" name="from" defaultValue={params.from} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-charcoal-soft">To</label>
            <Input type="date" name="to" defaultValue={params.to} required />
          </div>
          <Button type="submit" size="sm">
            Apply
          </Button>
        </form>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={formatBDT(summary.totalRevenue)} />
        <StatCard label="Total Orders" value={summary.totalOrders.toString()} />
        <StatCard label="Average Order Value" value={formatBDT(Math.round(summary.averageOrderValue))} />
        <StatCard label="COD Collection Rate" value={pct(summary.codCollectionRate)} />
        <StatCard label="Cancellation Rate" value={pct(summary.cancellationRate)} />
        <StatCard label="Return Rate" value={pct(summary.returnRate)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-lg text-charcoal">Daily Sales</h2>
          {summary.dailySales.length === 0 ? (
            <EmptyState title="No orders in this range." />
          ) : (
            <div className="mt-3 max-h-96 overflow-auto rounded-[var(--radius-card)] border border-line bg-soft-white">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-cream text-left text-xs uppercase tracking-wide text-charcoal-soft">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Orders</th>
                    <th className="px-4 py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.dailySales.map((d) => (
                    <tr key={d.date} className="border-t border-line">
                      <td className="px-4 py-2">{d.date}</td>
                      <td className="px-4 py-2">{d.orders}</td>
                      <td className="px-4 py-2">{formatBDT(d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h2 className="font-display text-lg text-charcoal">Best-Selling Products</h2>
          {summary.topProducts.length === 0 ? (
            <EmptyState title="No sales in this range." />
          ) : (
            <div className="mt-3 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-soft-white">
              {summary.topProducts.map((p) => (
                <div key={p.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="truncate text-charcoal">{p.name}</span>
                  <span className="shrink-0 text-charcoal-soft">
                    {p.unitsSold} sold · {formatBDT(p.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <h2 className="mt-6 font-display text-lg text-charcoal">Best-Selling Categories</h2>
          {summary.topCategories.length === 0 ? (
            <EmptyState title="No sales in this range." />
          ) : (
            <div className="mt-3 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-soft-white">
              {summary.topCategories.map((c) => (
                <div key={c.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="truncate capitalize text-charcoal">{c.name}</span>
                  <span className="shrink-0 text-charcoal-soft">
                    {c.unitsSold} sold · {formatBDT(c.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-4">
      <p className="text-xs uppercase tracking-wide text-charcoal-soft/70">{label}</p>
      <p className="mt-1 font-display text-xl text-charcoal">{value}</p>
    </div>
  );
}
