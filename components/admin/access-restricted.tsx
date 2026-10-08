import { ShieldAlert } from "lucide-react";

export function AccessRestricted({ requiredRole = "manager" }: { requiredRole?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-[var(--radius-card)] border border-line bg-soft-white p-10 text-center">
      <ShieldAlert size={32} className="mb-3 text-charcoal-soft" aria-hidden="true" />
      <h1 className="font-display text-xl text-charcoal">Access restricted</h1>
      <p className="mt-1 max-w-sm text-sm text-charcoal-soft">
        This area requires {requiredRole} access or higher. Contact an admin if you believe this is a mistake.
      </p>
    </div>
  );
}
