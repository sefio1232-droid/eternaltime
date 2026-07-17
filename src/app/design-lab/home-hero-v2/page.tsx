import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeHeroV2DesignLab } from "./home-hero-v2-design-lab";

export const metadata: Metadata = {
  title: "Homepage Hero V2 Design Lab",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

type HomeHeroV2DesignLabPageProps = {
  searchParams?: Promise<{
    review?: string;
  }>;
};

export default async function HomeHeroV2DesignLabPage({ searchParams }: HomeHeroV2DesignLabPageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const resolvedSearchParams = (await searchParams) ?? {};

  return <HomeHeroV2DesignLab reviewOnly={resolvedSearchParams.review === "1"} />;
}
