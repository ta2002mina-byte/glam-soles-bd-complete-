import { redirect } from "next/navigation";

// The full wishlist experience (guest localStorage + authenticated
// Supabase wishlist, merge-on-login) already lives at /wishlist from
// Phase 6. The account sidebar links here so "Wishlist" is present in
// the account area without duplicating that logic.
export default function AccountWishlistRedirect() {
  redirect("/wishlist");
}
