"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  mergeCommerceCartItems,
  parseCommerceCartStorage,
  serializeCommerceCartStorage,
} from "@/modules/commerce/domain/cart";
import {
  commerceCartStorageKey,
  type CommerceCartItemInput,
  type CommerceResolvedSummary,
} from "@/modules/commerce/domain/types";

const cartChangedEvent = "eternal-time:cart-changed";

export function notifyCommerceCartChanged() {
  window.dispatchEvent(new Event(cartChangedEvent));
}

export function useCommerceCart() {
  const [items, setItemsState] = useState<CommerceCartItemInput[]>([]);
  const [ready, setReady] = useState(false);

  const read = useCallback(() => {
    const parsed = parseCommerceCartStorage(window.localStorage.getItem(commerceCartStorageKey));
    setItemsState(parsed.items);
    setReady(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(read, 0);
    window.addEventListener("storage", read);
    window.addEventListener(cartChangedEvent, read);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", read);
      window.removeEventListener(cartChangedEvent, read);
    };
  }, [read]);

  const setItems = useCallback((nextItems: CommerceCartItemInput[]) => {
    const merged = mergeCommerceCartItems(nextItems);
    setItemsState(merged);
    try {
      window.localStorage.setItem(commerceCartStorageKey, serializeCommerceCartStorage(merged));
    } catch {
      // Storage can be unavailable in private contexts; the in-memory state remains usable.
    }
    notifyCommerceCartChanged();
  }, []);

  const addItem = useCallback(
    (item: CommerceCartItemInput) => {
      setItems([...items, item]);
    },
    [items, setItems],
  );

  const updateQuantity = useCallback(
    (brandSlug: string, referenceNormalized: string, quantity: number) => {
      setItems(
        items.map((item) =>
          item.brandSlug === brandSlug && item.referenceNormalized === referenceNormalized
            ? { ...item, quantity }
            : item,
        ),
      );
    },
    [items, setItems],
  );

  const removeItem = useCallback(
    (brandSlug: string, referenceNormalized: string) => {
      setItems(items.filter((item) => item.brandSlug !== brandSlug || item.referenceNormalized !== referenceNormalized));
    },
    [items, setItems],
  );

  const clear = useCallback(() => setItems([]), [setItems]);

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  return { items, ready, itemCount, setItems, addItem, updateQuantity, removeItem, clear };
}

export function useResolvedCommerceCart(items: CommerceCartItemInput[]) {
  const [summary, setSummary] = useState<CommerceResolvedSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (items.length === 0) {
      queueMicrotask(() => {
        if (!cancelled) {
          setSummary(null);
        }
      });
      return;
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true);
      }
    });
    fetch("/api/cart/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    })
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) {
          setSummary(payload.summary ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [items]);

  return { summary, loading };
}
