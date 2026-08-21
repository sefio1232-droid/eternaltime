export type NavigationItem = {
  label: string;
  href: string;
  description?: string;
};

export const publicNavigation: NavigationItem[] = [
  { label: "Часы", href: "/watches" },
  { label: "Подбор", href: "/selection" },
  { label: "Журнал", href: "/journal" },
];

export const utilityNavigation: NavigationItem[] = [
  { label: "Коллекция", href: "/collection" },
  { label: "Личный кабинет", href: "/account" },
];

export const accountNavigation: NavigationItem[] = [
  { label: "Обзор", href: "/account" },
  { label: "Корзина", href: "/cart" },
  { label: "Заказы", href: "/account/orders" },
  { label: "Коллекция", href: "/collection" },
  { label: "Профиль", href: "/account/profile" },
];

export const adminNavigation: NavigationItem[] = [
  { label: "Обзор", href: "/admin" },
  { label: "Catalog", href: "/admin/catalog" },
  { label: "Заказы", href: "/admin/orders" },
  { label: "Пользователи", href: "/admin/users" },
  { label: "System", href: "/admin/system" },
  { label: "Бренды", href: "/admin/brands" },
  { label: "Brand Collections", href: "/admin/brand-collections" },
  { label: "Editorial Selections", href: "/admin/editorial-selections" },
  { label: "Контент", href: "/admin/content" },
  { label: "SEO", href: "/admin/seo" },
  { label: "Импорты", href: "/admin/imports" },
  { label: "Настройки", href: "/admin/settings" },
];

export const foundationPublicRoutes = ["/", "/watches", "/brands", "/journal", "/faq", "/selection", "/collection", "/legal"] as const;
