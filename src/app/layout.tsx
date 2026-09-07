import type { Metadata } from "next";
import { getPublicEnv } from "@/config/public-env";
import "./globals.css";

const env = getPublicEnv();

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: "Eternal Time",
    template: "%s | Eternal Time",
  },
  description: "Eternal Time — интернет-магазин оригинальных наручных часов с каталогом, подбором, журналом и личной коллекцией.",
  applicationName: "Eternal Time",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
