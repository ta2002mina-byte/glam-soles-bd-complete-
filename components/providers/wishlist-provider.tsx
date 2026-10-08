"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { mergeGuestWishlistIntoServer, toggleServerWishlist } from "@/app/actions/wishlist";

interface WishlistContextValue {
  ids: string[];
  isAuthenticated: boolean;
  isSyncing: boolean;
  isWishlisted: (id: string) => boolean;
  toggle: (id: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);
const STORAGE_KEY = "glam-soles-bd:wishlist";

function readStoredIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function writeStoredIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // storage may be unavailable (private mode) — fail silently
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(readStoredIds);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) writeStoredIds(ids);
  }, [ids, isAuthenticated]);

  useEffect(() => {
    const supabase = createClient();

    async function handleSignedIn() {
      setIsSyncing(true);
      try {
        const guestIds = readStoredIds();
        const result = await mergeGuestWishlistIntoServer(guestIds);
        if (result.status === "ok") {
          setIds(result.productIds);
          writeStoredIds([]);
        }
        setIsAuthenticated(true);
      } finally {
        setIsSyncing(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setIsAuthenticated(false);
        setIds([]);
        writeStoredIds([]);
        return;
      }
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        void handleSignedIn();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggle = (id: string) => {
    if (isAuthenticated) {
      const wasWishlisted = ids.includes(id);
      // Optimistic update — reconciled with the server response right after.
      setIds((prev) => (wasWishlisted ? prev.filter((x) => x !== id) : [...prev, id]));
      setIsSyncing(true);
      toggleServerWishlist(id)
        .then((result) => {
          if (result.status === "ok") setIds(result.productIds);
        })
        .finally(() => setIsSyncing(false));
      return;
    }
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <WishlistContext.Provider
      value={{
        ids,
        isAuthenticated,
        isSyncing,
        isWishlisted: (id) => ids.includes(id),
        toggle,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
