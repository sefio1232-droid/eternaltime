"use client";

import { useEffect, useState } from "react";
import { emptyLocalCart, localCartStorageKey, parseLocalCart, serializeLocalCart, type LocalCart } from "@/modules/cart/application/local-cart";

export function useLocalCart() {
  const [cart, setCartState] = useState<LocalCart>(emptyLocalCart);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => { setCartState(parseLocalCart(window.localStorage.getItem(localCartStorageKey))); setReady(true); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  function setCart(next: LocalCart) {
    setCartState(next);
    try { window.localStorage.setItem(localCartStorageKey, serializeLocalCart(next)); } catch { /* The UI remains usable when storage is unavailable. */ }
  }
  return { cart, ready, setCart };
}
