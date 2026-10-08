import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <h2 className="text-xl text-charcoal">{title}</h2>
      {description && (
        <p className="max-w-sm text-sm text-charcoal-soft">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
