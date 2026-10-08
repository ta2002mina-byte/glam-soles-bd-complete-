import type { Metadata } from "next";
import Link from "next/link";
import { cn, formatBDT } from "@/lib/utils";
import { getDashboardSeries, getDashboardSummary } from "@/lib/supabase/admin/queries";
import { StatCard } from "@/components/admin/stat-card";
import { SeriesChart } from "@/components/admin/series-chart";
import type { DateRangeKey } from "@/types/admin";

export const metadata: Metadata = {
  title: "Dashboard — Glam Soles BD Admin",
  robots: { index: false, follow: false },
};

const RANGE_LABELS: Record<DateRangeKey, string> = {
  today: "Today",
  "7d": "7D",
  "30d": "30D",
  "3m": "3M",
  "1y": "1Y",
  custom: "Custom",
};

function resolveRange(key: DateRangeKey, fromParam?: string, toParam?: string): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);

  switch (key) {
    case "today":
      return { from, to };
    case "7d":
      from.setDate(from.getDate() - 6);
      return { from, to };
    case "30d":
      from.setDate(from.getDate() - 29);
      return { from, to };
    case "3m":
      from.setMonth(from.getMonth() - 3);
      return { from, to };
    case "1y":
      from.setFullYear(from.getFullYear() - 1);
      return { from, to };
    case "custom": {
      const customFrom = fromParam ? new Date(fromParam) : from;
      const customTo = toParam ? new Date(toParam) : to;
      if (Number.isNaN(customFrom.getTime()) || Number.isNaN(customTo.getTime()) || customFrom > customTo) {
        return { from, to };
      }
      customTo.setHours(23, 59, 59, 999);
      return { from: customFrom, to: customTo };
    }
    default:
      return { from, to };
  }
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const rangeKey: DateRangeKey = (["today", "7d", "30d", "3m", "1y", "custom"] as const).includes(
    params.range as DateRangeKey
  )
    ? (params.range as DateRangeKey)
    : "30d";

  const { from, to } = resolveRange(rangeKey, params.from, params.to);
  const [summary, series] = await Promise.all([getDashboardSummary(from, to), getDashboardSeries(from, to)]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-charcoal">Dashboard</h1>
          <p className="text-sm text-charcoal-soft">Real-time overview of Glam Soles BD.</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-full border border-line bg-soft-white p-1">
          {(Object.keys(RANGE_LABELS) as DateRangeKey[])
            .filter((k) => k !== "custom")
            .map((key) => (
              <Link
                key={key}
                href={`/admin?range=${key}`}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                  rangeKey === key ? "bg-charcoal text-soft-white" : "text-charcoal-soft hover:bg-cream"
                )}
              >
                {RANGE_LABELS[key]}
              </Link>
            ))}
        </div>
      </div>

      {!summary ? (
        <p className="rounded-[var(--radius-card)] border border-line bg-soft-white p-6 text-sm text-charcoal-soft">
          Dashboard data isn&apos;t available right now. Please refresh.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total Revenue" value={formatBDT(summary.totalRevenue)} hint={`${RANGE_LABELS[rangeKey]}`} />
            <StatCard label="Total Orders" value={summary.totalOrders.toLocaleString("en-BD")} hint={`${RANGE_LABELS[rangeKey]}`} />
            <StatCard label="Total Customers" value={summary.totalCustomers.toLocaleString("en-BD")} hint={`+${summary.newCustomers} new`} />
            <StatCard label="Total Products" value={summary.totalProducts.toLocaleString("en-BD")} />
            <StatCard label="Pending Orders" value={summary.pendingOrders.toLocaleString("en-BD")} tone={summary.pendingOrders > 0 ? "warning" : "default"} />
            <StatCard
              label="Low Stock"
              value={summary.lowStockCount.toLocaleString("en-BD")}
              hint={`${summary.outOfStockCount} out of stock`}
              tone={summary.lowStockCount > 0 ? "warning" : "default"}
            />
            <StatCard label="Returns Pending" value={summary.returnsPending.toLocaleString("en-BD")} tone={summary.returnsPending > 0 ? "warning" : "default"} />
            <StatCard label="Refunds" value={summary.refundsCount.toLocaleString("en-BD")} hint={`${RANGE_LABELS[rangeKey]}`} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <SeriesChart title="Revenue" series={series} valueKey="revenue" formatValue={formatBDT} />
            <SeriesChart title="Orders" series={series} valueKey="orders" />
            <SeriesChart title="New Customers" series={series} valueKey="newCustomers" />
          </div>
        </>
      )}
    </div>
  );
}
