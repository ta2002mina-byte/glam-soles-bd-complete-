"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { updateReturnStatus } from "@/app/actions/admin/returns";
import type { AdminReturnRow } from "@/types/admin";
import type { ReturnStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: ReturnStatus; label: string }[] = [
  { value: "requested", label: "Requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "exchanged", label: "Exchanged" },
  { value: "refunded", label: "Refunded" },
  { value: "completed", label: "Completed" },
];

const REASON_LABEL: Record<string, string> = {
  wrong_size: "Wrong size",
  wrong_product: "Wrong product",
  damaged: "Damaged",
  defective: "Defective",
  other: "Other",
};

const STATUS_BADGE_VARIANT: Record<ReturnStatus, "gold" | "blush" | "charcoal" | "outline"> = {
  requested: "gold",
  approved: "blush",
  rejected: "outline",
  exchanged: "blush",
  refunded: "charcoal",
  completed: "charcoal",
};

export function ReturnsTable({ initialReturns }: { initialReturns: AdminReturnRow[] }) {
  const [returns, setReturns] = useState(initialReturns);
  const [filter, setFilter] = useState<ReturnStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? returns : returns.filter((r) => r.status === filter)),
    [returns, filter]
  );

  if (returns.length === 0) {
    return <EmptyState title="No return or exchange requests yet." />;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="return-status-filter" className="text-sm text-charcoal-soft">
          Status
        </label>
        <Select
          id="return-status-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as ReturnStatus | "all")}
          className="max-w-[220px]"
        >
          <option value="all">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No requests match this filter." />
      ) : (
        <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-soft-white">
          {filtered.map((row) => (
            <ReturnRow
              key={row.id}
              row={row}
              isExpanded={expandedId === row.id}
              onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
              onUpdated={(next) => setReturns((prev) => prev.map((r) => (r.id === next.id ? next : r)))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReturnRow({
  row,
  isExpanded,
  onToggle,
  onUpdated,
}: {
  row: AdminReturnRow;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdated: (row: AdminReturnRow) => void;
}) {
  const [status, setStatus] = useState<ReturnStatus>(row.status);
  const [note, setNote] = useState(row.adminNote ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(nextStatus: ReturnStatus) {
    setIsSaving(true);
    setError(null);
    const result = await updateReturnStatus(row.id, nextStatus, note);
    setIsSaving(false);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    setStatus(nextStatus);
    onUpdated({ ...row, status: nextStatus, adminNote: note.trim() || null });
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-charcoal">
            {row.productName} <span className="text-charcoal-soft">· {row.color}/{row.size}</span>
          </p>
          <p className="text-xs text-charcoal-soft">
            {row.customerName} · {row.customerPhone} · Order {row.orderNumber} · {REASON_LABEL[row.reason] ?? row.reason}
          </p>
        </div>
        <Badge variant={STATUS_BADGE_VARIANT[status]} className="capitalize">
          {status}
        </Badge>
        <ChevronDown size={16} className={cn("shrink-0 text-charcoal-soft transition-transform", isExpanded && "rotate-180")} />
      </button>

      {isExpanded && (
        <div className="border-t border-line bg-cream/40 px-5 py-4">
          {row.description && <p className="text-sm text-charcoal-soft">{row.description}</p>}
          {row.photoUrl && (
            <div className="relative mt-3 h-28 w-28 overflow-hidden rounded-lg border border-line">
              <Image src={row.photoUrl} alt="Return photo" fill sizes="112px" className="object-cover" />
            </div>
          )}

          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-charcoal-soft">
            Admin note
          </label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mt-1" />

          {error && <p className="mt-2 text-sm text-blush-deep">{error}</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            {status === "requested" && (
              <>
                <Button size="sm" disabled={isSaving} onClick={() => save("approved")}>
                  Approve
                </Button>
                <Button size="sm" variant="outline" disabled={isSaving} onClick={() => save("rejected")}>
                  Reject
                </Button>
              </>
            )}
            {status === "approved" && (
              <>
                <Button size="sm" disabled={isSaving} onClick={() => save("exchanged")}>
                  Mark Exchanged
                </Button>
                <Button size="sm" variant="outline" disabled={isSaving} onClick={() => save("refunded")}>
                  Mark Refunded
                </Button>
              </>
            )}
            {(status === "exchanged" || status === "refunded") && (
              <Button size="sm" disabled={isSaving} onClick={() => save("completed")}>
                Mark Completed
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={isSaving} onClick={() => save(status)}>
              Save Note
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
