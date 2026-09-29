"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const yandexMetrikaCounterId = 113122613;

declare global {
  interface Window {
    dataLayer?: unknown[];
    ym?: (counterId: number, method: string, ...args: unknown[]) => void;
  }
}

const yandexMetrikaInitScript = `
  window.dataLayer = window.dataLayer || [];
  (function(m,e,t,r,i,k,a){
    m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) {
      if (document.scripts[j].src === r) { return; }
    }
    k=e.createElement(t);
    a=e.getElementsByTagName(t)[0];
    k.async=1;
    k.src=r;
    a.parentNode.insertBefore(k,a);
  })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=${yandexMetrikaCounterId}', 'ym');

  ym(${yandexMetrikaCounterId}, 'init', {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: 'dataLayer',
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true
  });
`;

function currentBrowserUrl(pathname: string, searchParams: URLSearchParams): string {
  const search = searchParams.toString();
  return `${window.location.origin}${pathname}${search ? `?${search}` : ""}${window.location.hash}`;
}

function YandexMetrikaRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const url = currentBrowserUrl(pathname, searchParams);

    if (previousUrlRef.current === null) {
      previousUrlRef.current = url;
      return;
    }

    if (previousUrlRef.current === url) {
      return;
    }

    previousUrlRef.current = url;
    window.ym?.(yandexMetrikaCounterId, "hit", url, {
      referrer: document.referrer,
      title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}

export function YandexMetrika() {
  return (
    <>
      <Script id="yandex-metrika" strategy="afterInteractive">
        {yandexMetrikaInitScript}
      </Script>
      <YandexMetrikaRouteTracker />
    </>
  );
}

export function YandexMetrikaNoScript() {
  return (
    <noscript>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element -- Yandex.Metrika noscript fallback requires a plain tracking pixel. */}
        <img src={`https://mc.yandex.ru/watch/${yandexMetrikaCounterId}`} style={{ position: "absolute", left: "-9999px" }} alt="" />
      </div>
    </noscript>
  );
}
