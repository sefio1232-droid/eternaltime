import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeHeroV3DesignLab } from "./home-hero-v3-design-lab";

export const metadata: Metadata = {
  title: "Homepage Hero V3 Design Lab",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

type HomeHeroV3DesignLabPageProps = {
  searchParams?: Promise<{
    review?: string;
  }>;
};

export default async function HomeHeroV3DesignLabPage({ searchParams }: HomeHeroV3DesignLabPageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const resolvedSearchParams = (await searchParams) ?? {};

  return <HomeHeroV3DesignLab reviewOnly={resolvedSearchParams.review === "1"} />;
}
