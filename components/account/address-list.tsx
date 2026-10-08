"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteAddress, setDefaultAddress } from "@/app/actions/account";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { AddressForm } from "@/components/account/address-form";
import type { Address } from "@/types";

export function AddressList({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [dialogAddress, setDialogAddress] = useState<Address | "new" | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function handleSaved() {
    setDialogAddress(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (pendingId) return;
    if (!window.confirm("Remove this address?")) return;
    setPendingId(id);
    await deleteAddress(id);
    setPendingId(null);
    router.refresh();
  }

  async function handleSetDefault(id: string) {
    if (pendingId) return;
    setPendingId(id);
    await setDefaultAddress(id);
    setPendingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-charcoal">Saved addresses</h2>
        <Button type="button" size="sm" variant="outline" onClick={() => setDialogAddress("new")}>
          <Plus size={15} /> Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <EmptyState title="No saved addresses yet." description="Add one to speed up checkout next time." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <div key={address.id} className="rounded-[var(--radius-card)] border border-line p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-gold" />
                  <Badge variant="outline" className="capitalize">
                    {address.label}
                  </Badge>
                  {address.isDefault && <Badge variant="gold">Default</Badge>}
                </div>
              </div>
              <p className="mt-3 text-sm font-medium text-charcoal">{address.fullName}</p>
              <p className="mt-1 text-sm text-charcoal-soft">{address.phone}</p>
              <p className="mt-1 text-sm leading-6 text-charcoal-soft">
                {address.fullAddress}, {address.area}, {address.district}, {address.division}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-sm">
                <button
                  type="button"
                  onClick={() => setDialogAddress(address)}
                  className="flex items-center gap-1.5 text-charcoal hover:text-gold"
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(address.id)}
                  disabled={pendingId === address.id}
                  className="flex items-center gap-1.5 text-blush-deep hover:text-blush-deep/80"
                >
                  {pendingId === address.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Delete
                </button>
                {!address.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(address.id)}
                    disabled={pendingId === address.id}
                    className="ml-auto text-charcoal-soft underline underline-offset-2 hover:text-charcoal"
                  >
                    Set as default
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={dialogAddress !== null}
        onClose={() => setDialogAddress(null)}
        title={dialogAddress === "new" ? "Add address" : "Edit address"}
        className="max-w-lg"
      >
        <h2 className="mb-4 font-display text-lg text-charcoal">
          {dialogAddress === "new" ? "Add address" : "Edit address"}
        </h2>
        {dialogAddress !== null && (
          <AddressForm address={dialogAddress === "new" ? undefined : dialogAddress} onSaved={handleSaved} />
        )}
      </Dialog>
    </div>
  );
}
