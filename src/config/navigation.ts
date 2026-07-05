export type NavigationItem = {
  label: string;
  href: string;
  description?: string;
};

export const publicNavigation: NavigationItem[] = [
  { label: "Часы", href: "/watches" },
  { label: "Бренды", href: "/brands" },
  { label: "Подбор часов", href: "/selection" },
  { label: "Сравнение", href: "/compare" },
  { label: "Моя коллекция", href: "/account/collection" },
];

export const utilityNavigation: NavigationItem[] = [
  { label: "Избранное", href: "/account/favorites" },
  { label: "Корзина", href: "/cart" },
  { label: "Аккаунт", href: "/account" },
];

export const accountNavigation: NavigationItem[] = [
  { label: "Обзор", href: "/account" },
  { label: "Заказы", href: "/account/orders" },
  { label: "Избранное", href: "/account/favorites" },
  { label: "Сравнения", href: "/account/comparisons" },
  { label: "Подборы", href: "/account/selections" },
  { label: "Моя коллекция", href: "/account/collection" },
  { label: "Анализ коллекции", href: "/account/collection/analysis" },
  { label: "Адреса", href: "/account/addresses" },
  { label: "Настройки", href: "/account/settings" },
];

export const adminNavigation: NavigationItem[] = [
  { label: "Обзор", href: "/admin" },
  { label: "Часы", href: "/admin/watches" },
  { label: "Бренды", href: "/admin/brands" },
  { label: "Brand Collections", href: "/admin/brand-collections" },
  { label: "Заказы", href: "/admin/orders" },
  { label: "Editorial Selections", href: "/admin/editorial-selections" },
  { label: "Контент", href: "/admin/content" },
  { label: "SEO", href: "/admin/seo" },
  { label: "Импорты", href: "/admin/imports" },
  { label: "Настройки", href: "/admin/settings" },
];

export const foundationPublicRoutes = ["/", "/watches", "/brands", "/selection", "/compare"] as const;
