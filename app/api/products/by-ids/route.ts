import { NextRequest, NextResponse } from "next/server";
import { getProductsByIds } from "@/lib/supabase/queries";

/**
 * Resolves a client-held list of product IDs (e.g. "recently viewed" IDs
 * kept in localStorage) into real, currently-published product cards.
 * Read-only, public data only — no auth required, no write-side effects.
 */
export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (ids.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const products = await getProductsByIds(ids);
  return NextResponse.json({ products });
}
