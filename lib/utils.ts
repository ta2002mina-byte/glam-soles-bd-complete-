import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBDT(amount: number) {
  return `৳ ${amount.toLocaleString("en-BD")}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Maps the lowercase DB enum to the UPPER_SNAKE status the UI/master spec uses. */
export function toUiOrderStatus(status: string): import("@/types").OrderStatus {
  return status.toUpperCase() as import("@/types").OrderStatus;
}

export function toUiPaymentStatus(status: string): import("@/types").PaymentStatus {
  return status.toUpperCase() as import("@/types").PaymentStatus;
}

/** Canonical forward progression used by the order tracking timeline. Cancelled/Returned are shown separately. */
export const ORDER_STATUS_STEPS: { status: import("@/types").OrderStatus; label: string }[] = [
  { status: "CONFIRMED", label: "Order Confirmed" },
  { status: "PROCESSING", label: "Processing" },
  { status: "PACKED", label: "Packed" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { status: "DELIVERED", label: "Delivered" },
];
