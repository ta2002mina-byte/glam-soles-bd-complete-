import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "danger";
}

export function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-charcoal-soft">{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-2xl text-charcoal",
          tone === "warning" && "text-gold",
          tone === "danger" && "text-blush-deep"
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-charcoal-soft">{hint}</p>}
    </div>
  );
}
