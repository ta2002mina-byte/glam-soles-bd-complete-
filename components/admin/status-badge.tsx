import { cn } from "@/lib/utils";

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-cream text-charcoal-soft",
  info: "bg-blush text-charcoal",
  warning: "bg-gold-soft text-charcoal",
  success: "bg-charcoal text-soft-white",
  danger: "bg-blush-deep text-soft-white",
};

const ORDER_STATUS_TONE: Record<string, keyof typeof TONE_CLASSES> = {
  pending: "warning",
  confirmed: "info",
  processing: "info",
  packed: "info",
  shipped: "info",
  out_for_delivery: "info",
  delivered: "success",
  cancelled: "danger",
  returned: "danger",
};

const PAYMENT_STATUS_TONE: Record<string, keyof typeof TONE_CLASSES> = {
  pending: "warning",
  collected: "success",
  failed: "danger",
  refunded: "neutral",
};

const STOCK_STATUS_TONE: Record<string, keyof typeof TONE_CLASSES> = {
  in_stock: "success",
  low_stock: "warning",
  out_of_stock: "danger",
};

function label(value: string) {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", TONE_CLASSES[ORDER_STATUS_TONE[status] ?? "neutral"])}>
      {label(status)}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", TONE_CLASSES[PAYMENT_STATUS_TONE[status] ?? "neutral"])}>
      {label(status)}
    </span>
  );
}

export function StockStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", TONE_CLASSES[STOCK_STATUS_TONE[status] ?? "neutral"])}>
      {label(status)}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const tone = role === "admin" ? "success" : role === "manager" ? "info" : role === "staff" ? "warning" : "neutral";
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", TONE_CLASSES[tone])}>{label(role)}</span>;
}
