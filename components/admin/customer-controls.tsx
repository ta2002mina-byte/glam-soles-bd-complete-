"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateCustomerRole, updateCustomerStatus } from "@/app/actions/admin/customers";
import type { UserRole } from "@/types/database";

const ROLES: UserRole[] = ["customer", "staff", "manager", "admin"];

export function CustomerStatusControl({ customerId, accountStatus }: { customerId: string; accountStatus: "active" | "suspended" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    const next = accountStatus === "active" ? "suspended" : "active";
    startTransition(async () => {
      const result = await updateCustomerStatus(customerId, next);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={toggle}>
        {accountStatus === "active" ? "Suspend account" : "Reactivate account"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-blush-deep">
          {error}
        </p>
      )}
    </div>
  );
}

/** Only rendered by the parent page when the viewer's role is admin. */
export function CustomerRoleControl({ customerId, role }: { customerId: string; role: UserRole }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextRole = e.target.value as UserRole;
    setError(null);
    startTransition(async () => {
      const result = await updateCustomerRole(customerId, nextRole);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <label htmlFor="customer-role" className="mb-1.5 block text-sm font-medium text-charcoal">
        Role
      </label>
      <select
        id="customer-role"
        defaultValue={role}
        onChange={handleChange}
        disabled={pending}
        className="h-10 rounded-lg border border-line bg-soft-white px-3 text-sm text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="mt-2 text-sm text-blush-deep">
          {error}
        </p>
      )}
    </div>
  );
}
