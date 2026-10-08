import type { Metadata } from "next";
import { getAddresses } from "@/lib/supabase/queries";
import { AddressList } from "@/components/account/address-list";

export const metadata: Metadata = { title: "Addresses — Glam Soles BD" };

export default async function AccountAddressesPage() {
  const addresses = await getAddresses();
  return <AddressList addresses={addresses} />;
}
