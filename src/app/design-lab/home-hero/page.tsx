import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeHeroDesignLab } from "./home-hero-design-lab";

export const metadata: Metadata = {
  title: "Homepage Hero Design Lab",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function HomeHeroDesignLabPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <HomeHeroDesignLab />;
}
