import type { DashboardSeriesPoint } from "@/types/admin";

interface SeriesChartProps {
  title: string;
  series: DashboardSeriesPoint[];
  valueKey: "revenue" | "orders" | "newCustomers";
  formatValue?: (value: number) => string;
}

/**
 * Minimal, dependency-free bar chart rendered as inline SVG. Avoids pulling
 * in a charting library for a handful of admin bars; scales to whatever
 * date range is selected (Today .. 1Y) and degrades gracefully to an empty
 * state when there's no real data yet.
 */
export function SeriesChart({ title, series, valueKey, formatValue }: SeriesChartProps) {
  const values = series.map((p) => p[valueKey]);
  const max = Math.max(1, ...values);
  const width = 640;
  const height = 200;
  const barGap = 2;
  const barWidth = series.length > 0 ? Math.max(2, width / series.length - barGap) : 0;
  const hasData = values.some((v) => v > 0);

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5 shadow-sm">
      <h3 className="mb-4 font-display text-lg text-charcoal">{title}</h3>
      {!hasData ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-charcoal-soft">
          No data for this period yet.
        </div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[200px] w-full" role="img" aria-label={title}>
          {series.map((point, i) => {
            const value = point[valueKey];
            const barHeight = max > 0 ? (value / max) * (height - 24) : 0;
            const x = i * (barWidth + barGap);
            const y = height - barHeight - 20;
            return (
              <g key={point.date}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={2}
                  fill="var(--color-gold)"
                  opacity={value > 0 ? 1 : 0.15}
                >
                  <title>
                    {point.date}: {formatValue ? formatValue(value) : value}
                  </title>
                </rect>
              </g>
            );
          })}
          <line x1={0} y1={height - 20} x2={width} y2={height - 20} stroke="var(--color-line)" strokeWidth={1} />
        </svg>
      )}
      <div className="mt-2 flex justify-between text-xs text-charcoal-soft">
        <span>{series[0]?.date}</span>
        <span>{series[series.length - 1]?.date}</span>
      </div>
    </div>
  );
}
