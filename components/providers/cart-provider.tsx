"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { CartLine } from "@/types";
import { createClient } from "@/lib/supabase/client";
import {
  addToServerCart,
  mergeGuestCartIntoServerCart,
  removeFromServerCart,
  clearServerCart,
  updateServerCartQuantity,
} from "@/app/actions/cart";

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  /** Signed-in shoppers get a Supabase-backed cart; guests get localStorage only. */
  isAuthenticated: boolean;
  /** True while a mutation is being written to the server-side cart. */
  isSyncing: boolean;
  addLine: (line: CartLine) => void;
  removeLine: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => Promise<void>;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "glam-soles-bd:cart";

function readStoredLines(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function writeStoredLines(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // storage may be unavailable — fail silently
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readStoredLines);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  // Guest cart is mirrored to localStorage. Once signed in, the Supabase
  // cart is the single source of truth — we stop writing here so a shared
  // device never leaves one shopper's bag sitting around for the next.
  useEffect(() => {
    if (!isAuthenticated) writeStoredLines(lines);
  }, [lines, isAuthenticated]);

  useEffect(() => {
    const supabase = createClient();

    async function handleSignedIn() {
      setIsSyncing(true);
      try {
        const guestLines = readStoredLines();
        const result = await mergeGuestCartIntoServerCart(
          guestLines.map((l) => ({ variantId: l.variantId, quantity: l.quantity }))
        );
        if (result.status === "ok") {
          setLines(result.lines);
          writeStoredLines([]);
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
        setLines([]);
        writeStoredLines([]);
        return;
      }
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        void handleSignedIn();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const addLine = (line: CartLine) => {
    if (isAuthenticated) {
      setIsSyncing(true);
      addToServerCart(line.variantId, line.quantity)
        .then((result) => {
          if (result.status === "ok") setLines(result.lines);
        })
        .finally(() => setIsSyncing(false));
      return;
    }

    setLines((prev) => {
      const existing = prev.find((l) => l.variantId === line.variantId);
      if (existing) {
        return prev.map((l) =>
          l.variantId === line.variantId
            ? { ...l, quantity: l.quantity + line.quantity }
            : l
        );
      }
      return [...prev, line];
    });
  };

  const removeLine = (variantId: string) => {
    if (isAuthenticated) {
      setIsSyncing(true);
      removeFromServerCart(variantId)
        .then((result) => {
          if (result.status === "ok") setLines(result.lines);
        })
        .finally(() => setIsSyncing(false));
      return;
    }
    setLines((prev) => prev.filter((l) => l.variantId !== variantId));
  };

  const setQuantity = (variantId: string, quantity: number) => {
    if (isAuthenticated) {
      setIsSyncing(true);
      updateServerCartQuantity(variantId, quantity)
        .then((result) => {
          if (result.status === "ok") setLines(result.lines);
        })
        .finally(() => setIsSyncing(false));
      return;
    }
    if (quantity <= 0) return removeLine(variantId);
    setLines((prev) =>
      prev.map((l) => (l.variantId === variantId ? { ...l, quantity } : l))
    );
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      setIsSyncing(true);
      try {
        const result = await clearServerCart();
        if (result.status === "ok") setLines([]);
      } finally {
        setIsSyncing(false);
      }
      return;
    }
    setLines([]);
    writeStoredLines([]);
  };

  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  return (
    <CartContext.Provider
      value={{
        lines,
        count,
        subtotal,
        isAuthenticated,
        isSyncing,
        addLine,
        removeLine,
        setQuantity,
        clearCart,
        isDrawerOpen,
        openDrawer: () => setDrawerOpen(true),
        closeDrawer: () => setDrawerOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
