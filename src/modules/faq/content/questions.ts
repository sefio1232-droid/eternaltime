export type FaqCategory = "Подбор" | "Каталог" | "Заказ и доставка" | "Подлинность и комплект" | "Гарантия и возврат" | "Коллекция и аккаунт" | "Связь";

export type FaqItem = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  relatedLink?: { href: string; label: string };
};

export const faqItems: FaqItem[] = [
  {
    id: "start-selection",
    category: "Подбор",
    question: "Как начать подбор часов?",
    answer: "Начните со сценария использования и критериев, которые важны именно вам. Раздел подбора помогает перейти от задачи к подходящим вариантам, не начиная с бренда или случайной витрины.",
    relatedLink: { href: "/selection", label: "Начать подбор" },
  },
  {
    id: "selection-vs-catalog",
    category: "Подбор",
    question: "Чем подбор отличается от каталога?",
    answer: "Каталог позволяет самостоятельно изучать опубликованные модели и фильтры. Подбор организует тот же выбор вокруг вашего сценария, предпочтений и ограничений.",
    relatedLink: { href: "/watches", label: "Открыть каталог" },
  },
  {
    id: "reference-identity",
    category: "Каталог",
    question: "Почему в карточке важен артикул производителя?",
    answer: "Артикул помогает однозначно определить конкретную модель внутри бренда: цвет, размер, механизм и комплектацию. По нему проще найти точную карточку часов и связанные материалы без путаницы с похожими названиями.",
  },
  {
    id: "missing-price",
    category: "Каталог",
    question: "Почему у некоторых часов может не быть цены?",
    answer: "У некоторых моделей карточка может быть справочной: мы показываем характеристики и фото, но цена появится только тогда, когда модель реально доступна к заказу. Если цены нет, ориентируйтесь на другие доступные варианты или напишите нам для уточнения.",
  },
  {
    id: "order-availability",
    category: "Заказ и доставка",
    question: "Можно ли оформить заказ на любую модель из каталога?",
    answer: "Нет. Карточка в каталоге не всегда означает, что модель можно купить прямо сейчас. Если часы доступны к заказу, на странице будет актуальная цена и понятное действие для оформления.",
  },
  {
    id: "delivery-time",
    category: "Заказ и доставка",
    question: "Какой срок доставки?",
    answer: "Единый срок доставки не публикуется без подтвержденных условий. Он зависит от наличия, поставщика и логистики и должен быть согласован для конкретного заказа до оформления.",
  },
  {
    id: "authenticity-set",
    category: "Подлинность и комплект",
    question: "Как подтверждаются подлинность и комплект?",
    answer: "Сайт не заменяет отсутствующие данные общими обещаниями. Происхождение, состояние и комплект конкретных часов должны подтверждаться проверенными данными предложения до заказа.",
  },
  {
    id: "warranty-return",
    category: "Гарантия и возврат",
    question: "Какие условия гарантии и возврата действуют?",
    answer: "Актуальные условия гарантии, возврата и обмена размещены в юридическом разделе Eternal Time и подтверждаются при оформлении заказа. Если по конкретной модели нужны детали перед покупкой, напишите нам — уточним условия до оплаты.",
  },
  {
    id: "personal-collection",
    category: "Коллекция и аккаунт",
    question: "Что можно хранить в личной коллекции?",
    answer: "Личная коллекция предназначена для часов владельца. В нее можно добавить модель из каталога или собственные данные о часах; ручная запись не создает публичную карточку каталога.",
    relatedLink: { href: "/collection", label: "Открыть коллекцию" },
  },
  {
    id: "contact-channel",
    category: "Связь",
    question: "Где задать вопрос, которого нет в FAQ?",
    answer: "Напишите нам на timeeternal@mail.ru. Укажите, что именно хотите уточнить: модель, артикул, заказ, доставку или работу личной коллекции — так мы быстрее ответим по делу.",
    relatedLink: { href: "mailto:timeeternal@mail.ru", label: "Написать нам" },
  },
];

export function validateFaqItems(items: FaqItem[] = faqItems): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const item of items) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)) issues.push(`${item.id}: invalid id`);
    if (ids.has(item.id)) issues.push(`${item.id}: duplicate id`);
    ids.add(item.id);
    if (!item.question.trim()) issues.push(`${item.id}: question is required`);
    if (!item.answer.trim()) issues.push(`${item.id}: answer is required`);
    if (/[ёЁ]/.test(`${item.question} ${item.answer} ${item.relatedLink?.label ?? ""}`)) issues.push(`${item.id}: use е instead of ё`);
    if (item.relatedLink && !item.relatedLink.href.startsWith("/") && !item.relatedLink.href.startsWith("mailto:")) issues.push(`${item.id}: related link must be internal or email`);
  }
  return issues;
}
