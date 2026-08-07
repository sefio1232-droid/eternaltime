import type { Metadata } from "next";
import { CartExperience } from "@/components/cart/cart-experience";

export const metadata: Metadata = {
  title: "Корзина",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CartPage() {
  return <CartExperience />;
}
