export type HomeHeroScenarioId = "01" | "02" | "03" | "04" | "05" | "06";

export type HomeHeroWatch = {
  brand: "Tissot" | "Orient" | "Casio";
  model: string;
  reference: string;
  referenceSlug: string;
  publicPriceRub: number;
  assetPath: string;
  href: string;
  assetQuality?: string;
};

export type HomeHeroSpecCallout = {
  value: string;
  label: string;
  sourceField: string;
  x: string;
  y: string;
  align: "left" | "right";
  lineLength: string;
  emphasis: "primary" | "secondary";
};

export type HomeHeroVisualConfig = {
  mood: string;
  primaryWord: {
    x: string;
    y: string;
    size: string;
    maxWidth: string;
    lineHeight: string;
    opacity: string;
  };
  secondaryPhrase: {
    x: string;
    y: string;
    size: string;
    maxWidth: string;
    lineHeight: string;
    opacity: string;
  };
  mainWatch: {
    x: string;
    y: string;
    width: string;
    height: string;
    maxHeight: string;
    rotate: string;
    scale: string;
    shadow: string;
    safeInsetTop: string;
    safeInsetRight: string;
    safeInsetBottom: string;
    safeInsetLeft: string;
  };
  secondaryWatch: {
    x: string;
    y: string;
    height: string;
    opacity: string;
    scale: string;
    imageOffsetY: string;
  };
};

export type HomeHeroScenario = {
  id: HomeHeroScenarioId;
  title: string;
  primaryWord: string;
  secondaryPhrase: string;
  description: string;
  main: HomeHeroWatch;
  secondary: HomeHeroWatch;
  specs: HomeHeroSpecCallout[];
  visual: HomeHeroVisualConfig;
  missingSpecWarnings?: string[];
  qualityNote?: string;
};

export type RejectedHomeHeroAlternative = {
  brand: string;
  model: string;
  reference: string;
  reason: string;
};

const candidateRoot = "/generated/home-hero/candidates";

export const homeHeroScenarios: HomeHeroScenario[] = [
  {
    id: "01",
    title: "На каждый день",
    primaryWord: "РИТМ",
    secondaryPhrase: "НА КАЖДЫЙ ДЕНЬ",
    description: "Часы для спокойного ежедневного ритма, работы и города.",
    main: {
      brand: "Tissot",
      model: "PR 100 Chronograph",
      reference: "T150.417.11.041.00",
      referenceSlug: "t1504171104100",
      publicPriceRub: 45678,
      assetPath: `${candidateRoot}/01-everyday/secondary-01.png`,
      href: "/watches/tissot/t1504171104100",
    },
    secondary: {
      brand: "Tissot",
      model: "Classic Dream 40mm",
      reference: "T158.407.11.051.00",
      referenceSlug: "t1584071105100",
      publicPriceRub: 58000,
      assetPath: `${candidateRoot}/01-everyday/main-01.png`,
      href: "/watches/tissot/t1584071105100",
    },
    specs: [
      {
        value: "40 ММ",
        label: "ДИАМЕТР ИЗ НАЗВАНИЯ МОДЕЛИ",
        sourceField: "identity.title",
        x: "13%",
        y: "70%",
        align: "left",
        lineLength: "74px",
        emphasis: "primary",
      },
      {
        value: "ХРОНОГРАФ",
        label: "МЕХАНИЗМ: КВАРЦЕВЫЙ ХРОНОГРАФ",
        sourceField: "specifications.firstClass.movement_raw",
        x: "63%",
        y: "76%",
        align: "right",
        lineLength: "62px",
        emphasis: "secondary",
      },
    ],
    visual: {
      mood: "#d3b88a",
      primaryWord: { x: "9%", y: "14%", size: "clamp(82px, 8.8vw, 128px)", maxWidth: "470px", lineHeight: "0.82", opacity: "0.7" },
      secondaryPhrase: { x: "19%", y: "55%", size: "clamp(38px, 4.4vw, 70px)", maxWidth: "370px", lineHeight: "0.88", opacity: "0.12" },
      mainWatch: {
        x: "52%",
        y: "52%",
        width: "78%",
        height: "74%",
        maxHeight: "560px",
        rotate: "-1deg",
        scale: "1.42",
        shadow: "0 34px 44px rgb(16 19 22 / 15%)",
        safeInsetTop: "12px",
        safeInsetRight: "16px",
        safeInsetBottom: "18px",
        safeInsetLeft: "14px",
      },
      secondaryWatch: { x: "80%", y: "13%", height: "126px", opacity: "0.58", scale: "1.8", imageOffsetY: "-30%" },
    },
    missingSpecWarnings: ["Water resistance is not confirmed in the current Tissot import characteristics."],
  },
  {
    id: "02",
    title: "Под рубашку",
    primaryWord: "КЛАССИКА",
    secondaryPhrase: "ПОД РУБАШКУ",
    description: "Сдержанные часы для делового образа и аккуратного повседневного стиля.",
    main: {
      brand: "Tissot",
      model: "PR 100 40mm",
      reference: "T150.410.16.051.00",
      referenceSlug: "t1504101605100",
      publicPriceRub: 38000,
      assetPath: `${candidateRoot}/02-under-shirt/main-01.png`,
      href: "/watches/tissot/t1504101605100",
    },
    secondary: {
      brand: "Tissot",
      model: "PR 100 34mm",
      reference: "T150.210.11.041.00",
      referenceSlug: "t1502101104100",
      publicPriceRub: 38000,
      assetPath: `${candidateRoot}/02-under-shirt/secondary-01.png`,
      href: "/watches/tissot/t1502101104100",
    },
    specs: [
      {
        value: "40 ММ",
        label: "ДИАМЕТР ИЗ НАЗВАНИЯ МОДЕЛИ",
        sourceField: "identity.title",
        x: "12%",
        y: "68%",
        align: "left",
        lineLength: "70px",
        emphasis: "primary",
      },
      {
        value: "КОЖА",
        label: "БРАСЛЕТ/РЕМЕШОК: КОЖАНЫЙ РЕМЕШОК",
        sourceField: "specifications.controlledAttributes.attachment_material_raw",
        x: "62%",
        y: "75%",
        align: "right",
        lineLength: "58px",
        emphasis: "secondary",
      },
    ],
    visual: {
      mood: "#c8ad82",
      primaryWord: { x: "7%", y: "12%", size: "clamp(66px, 7.2vw, 108px)", maxWidth: "500px", lineHeight: "0.84", opacity: "0.64" },
      secondaryPhrase: { x: "20%", y: "56%", size: "clamp(32px, 3.8vw, 60px)", maxWidth: "330px", lineHeight: "0.9", opacity: "0.12" },
      mainWatch: {
        x: "51%",
        y: "49%",
        width: "72%",
        height: "70%",
        maxHeight: "520px",
        rotate: "0deg",
        scale: "1.36",
        shadow: "0 30px 40px rgb(16 19 22 / 13%)",
        safeInsetTop: "12px",
        safeInsetRight: "16px",
        safeInsetBottom: "18px",
        safeInsetLeft: "14px",
      },
      secondaryWatch: { x: "80%", y: "14%", height: "118px", opacity: "0.54", scale: "1.68", imageOffsetY: "-30%" },
    },
    missingSpecWarnings: ["Thickness is not confirmed in the current Tissot import characteristics."],
  },
  {
    id: "03",
    title: "Для путешествий",
    primaryWord: "ДВИЖЕНИЕ",
    secondaryPhrase: "ДЛЯ ПУТЕШЕСТВИЙ",
    description: "Надежные часы для дороги, новых городов и активного ритма.",
    main: {
      brand: "Tissot",
      model: "Seastar 1000 Chronograph 45.5mm",
      reference: "T120.417.11.041.01",
      referenceSlug: "t1204171104101",
      publicPriceRub: 65000,
      assetPath: `${candidateRoot}/03-travel/main-01.png`,
      href: "/watches/tissot/t1204171104101",
    },
    secondary: {
      brand: "Casio",
      model: "GBD-H1000-1A4",
      reference: "GBD-H1000-1A4",
      referenceSlug: "gbdh10001a4",
      publicPriceRub: 60000,
      assetPath: `${candidateRoot}/03-travel/alt-01.png`,
      href: "/watches/casio/gbdh10001a4",
    },
    specs: [
      {
        value: "45,5 ММ",
        label: "ДИАМЕТР ИЗ НАЗВАНИЯ МОДЕЛИ",
        sourceField: "identity.title",
        x: "11%",
        y: "72%",
        align: "left",
        lineLength: "76px",
        emphasis: "primary",
      },
      {
        value: "ХРОНОГРАФ",
        label: "МЕХАНИЗМ: КВАРЦЕВЫЙ ХРОНОГРАФ",
        sourceField: "specifications.firstClass.movement_raw",
        x: "63%",
        y: "78%",
        align: "right",
        lineLength: "68px",
        emphasis: "secondary",
      },
    ],
    visual: {
      mood: "#aeb8c1",
      primaryWord: { x: "6%", y: "12%", size: "clamp(62px, 7.4vw, 110px)", maxWidth: "520px", lineHeight: "0.84", opacity: "0.54" },
      secondaryPhrase: { x: "12%", y: "55%", size: "clamp(30px, 3.7vw, 58px)", maxWidth: "430px", lineHeight: "0.9", opacity: "0.12" },
      mainWatch: {
        x: "54%",
        y: "52%",
        width: "80%",
        height: "78%",
        maxHeight: "590px",
        rotate: "-1deg",
        scale: "1.32",
        shadow: "0 36px 48px rgb(16 19 22 / 17%)",
        safeInsetTop: "12px",
        safeInsetRight: "14px",
        safeInsetBottom: "18px",
        safeInsetLeft: "14px",
      },
      secondaryWatch: { x: "80%", y: "13%", height: "132px", opacity: "0.6", scale: "1.66", imageOffsetY: "-29%" },
    },
    missingSpecWarnings: ["Water resistance is not confirmed in the current Tissot import characteristics."],
  },
  {
    id: "04",
    title: "Первая механика",
    primaryWord: "МЕХАНИЗМ",
    secondaryPhrase: "ПЕРВАЯ МЕХАНИКА",
    description: "Понятный первый шаг в мир автоматических часов.",
    main: {
      brand: "Casio",
      model: "Edifice EFK-100D-2A",
      reference: "EFK-100D-2A",
      referenceSlug: "efk100d2a",
      publicPriceRub: 31213,
      assetPath: `${candidateRoot}/04-first-mechanical/main-01.png`,
      href: "/watches/casio/efk100d2a",
    },
    secondary: {
      brand: "Orient",
      model: "Bambino 38",
      reference: "RA-AC0M03S30B",
      referenceSlug: "raac0m03s30b",
      publicPriceRub: 37000,
      assetPath: `${candidateRoot}/04-first-mechanical/secondary-01.png`,
      href: "/watches/orient/raac0m03s30b",
      assetQuality: "Low-resolution source: 328x492. Keep around 150-180 CSS px tall.",
    },
    specs: [
      {
        value: "АВТОМАТИКА",
        label: "ТИП МЕХАНИЗМА: МЕХАНИЧЕСКИЙ С АВТОПОДЗАВОДОМ",
        sourceField: "specifications.firstClass.movement_type_raw",
        x: "10%",
        y: "70%",
        align: "left",
        lineLength: "76px",
        emphasis: "primary",
      },
      {
        value: "~40 ЧАСОВ",
        label: "СРОК СЛУЖБЫ / ЗАПАС ХОДА",
        sourceField: "specifications.unresolvedAttributes.срокслужбы/запасхода",
        x: "63%",
        y: "78%",
        align: "right",
        lineLength: "64px",
        emphasis: "secondary",
      },
    ],
    visual: {
      mood: "#c4b79e",
      primaryWord: { x: "8%", y: "13%", size: "clamp(58px, 6.8vw, 100px)", maxWidth: "500px", lineHeight: "0.84", opacity: "0.58" },
      secondaryPhrase: { x: "18%", y: "55%", size: "clamp(28px, 3.4vw, 54px)", maxWidth: "390px", lineHeight: "0.92", opacity: "0.11" },
      mainWatch: {
        x: "48%",
        y: "53%",
        width: "70%",
        height: "68%",
        maxHeight: "520px",
        rotate: "0deg",
        scale: "1",
        shadow: "0 34px 42px rgb(16 19 22 / 15%)",
        safeInsetTop: "12px",
        safeInsetRight: "14px",
        safeInsetBottom: "16px",
        safeInsetLeft: "14px",
      },
      secondaryWatch: { x: "80%", y: "14%", height: "160px", opacity: "0.62", scale: "1.36", imageOffsetY: "-18%" },
    },
    qualityNote: "SECONDARY ASSET REQUIRES REPLACEMENT BEFORE PRODUCTION",
  },
  {
    id: "05",
    title: "Для спорта",
    primaryWord: "ЭНЕРГИЯ",
    secondaryPhrase: "ДЛЯ СПОРТА",
    description: "Крепкие часы для движения, нагрузки и активного дня.",
    main: {
      brand: "Tissot",
      model: "Seastar 1000 40mm",
      reference: "T120.410.33.091.00",
      referenceSlug: "t1204103309100",
      publicPriceRub: 58000,
      assetPath: `${candidateRoot}/05-sport/main-01.png`,
      href: "/watches/tissot/t1204103309100",
    },
    secondary: {
      brand: "Casio",
      model: "GBD-H1000-1A4",
      reference: "GBD-H1000-1A4",
      referenceSlug: "gbdh10001a4",
      publicPriceRub: 60000,
      assetPath: `${candidateRoot}/05-sport/secondary-01.png`,
      href: "/watches/casio/gbdh10001a4",
    },
    specs: [
      {
        value: "САПФИР",
        label: "СТЕКЛО: САПФИРОВОЕ",
        sourceField: "specifications.controlledAttributes.crystal_type_raw",
        x: "12%",
        y: "70%",
        align: "left",
        lineLength: "72px",
        emphasis: "primary",
      },
      {
        value: "PVD",
        label: "КОРПУС: НЕРЖАВЕЮЩАЯ СТАЛЬ С PVD-ПОКРЫТИЕМ",
        sourceField: "specifications.controlledAttributes.case_material_raw",
        x: "63%",
        y: "78%",
        align: "right",
        lineLength: "62px",
        emphasis: "secondary",
      },
    ],
    visual: {
      mood: "#9fb79a",
      primaryWord: { x: "7%", y: "12%", size: "clamp(62px, 7.2vw, 108px)", maxWidth: "500px", lineHeight: "0.84", opacity: "0.5" },
      secondaryPhrase: { x: "21%", y: "55%", size: "clamp(32px, 4vw, 64px)", maxWidth: "330px", lineHeight: "0.9", opacity: "0.12" },
      mainWatch: {
        x: "52%",
        y: "53%",
        width: "82%",
        height: "80%",
        maxHeight: "600px",
        rotate: "1deg",
        scale: "1.28",
        shadow: "0 40px 50px rgb(16 19 22 / 19%)",
        safeInsetTop: "12px",
        safeInsetRight: "14px",
        safeInsetBottom: "18px",
        safeInsetLeft: "14px",
      },
      secondaryWatch: { x: "80%", y: "13%", height: "132px", opacity: "0.62", scale: "1.66", imageOffsetY: "-29%" },
    },
    missingSpecWarnings: ["Water resistance is not confirmed in the current Tissot import characteristics."],
  },
  {
    id: "06",
    title: "В коллекцию",
    primaryWord: "ХАРАКТЕР",
    secondaryPhrase: "В КОЛЛЕКЦИЮ",
    description: "Выразительная модель, которая добавляет коллекции новый характер.",
    main: {
      brand: "Tissot",
      model: "PRX Powermatic 80 40mm",
      reference: "T137.407.33.051.00",
      referenceSlug: "t1374073305100",
      publicPriceRub: 101010,
      assetPath: `${candidateRoot}/06-collection/main-01.png`,
      href: "/watches/tissot/t1374073305100",
    },
    secondary: {
      brand: "Tissot",
      model: "Seastar 1000 Chronograph",
      reference: "T120.417.17.051.03",
      referenceSlug: "t1204171705103",
      publicPriceRub: 68000,
      assetPath: `${candidateRoot}/06-collection/secondary-01.png`,
      href: "/watches/tissot/t1204171705103",
    },
    specs: [
      {
        value: "POWERMATIC 80",
        label: "MODEL NAME / COLLECTION POSITIONING",
        sourceField: "identity.title",
        x: "11%",
        y: "70%",
        align: "left",
        lineLength: "76px",
        emphasis: "primary",
      },
      {
        value: "АВТОПОДЗАВОД",
        label: "МЕХАНИЗМ: МЕХАНИЧЕСКИЙ С АВТОПОДЗАВОДОМ",
        sourceField: "specifications.firstClass.movement_raw",
        x: "63%",
        y: "78%",
        align: "right",
        lineLength: "66px",
        emphasis: "secondary",
      },
    ],
    visual: {
      mood: "#d2b878",
      primaryWord: { x: "6%", y: "12%", size: "clamp(58px, 6.8vw, 100px)", maxWidth: "520px", lineHeight: "0.84", opacity: "0.64" },
      secondaryPhrase: { x: "22%", y: "56%", size: "clamp(32px, 3.8vw, 60px)", maxWidth: "340px", lineHeight: "0.9", opacity: "0.12" },
      mainWatch: {
        x: "50%",
        y: "51%",
        width: "76%",
        height: "72%",
        maxHeight: "540px",
        rotate: "0deg",
        scale: "1.28",
        shadow: "0 34px 42px rgb(16 19 22 / 14%)",
        safeInsetTop: "12px",
        safeInsetRight: "16px",
        safeInsetBottom: "18px",
        safeInsetLeft: "14px",
      },
      secondaryWatch: { x: "80%", y: "13%", height: "124px", opacity: "0.58", scale: "1.7", imageOffsetY: "-30%" },
    },
    missingSpecWarnings: ["Exact PRX power reserve value is not present as a separate import characteristic."],
  },
];

export const rejectedHomeHeroAlternatives: RejectedHomeHeroAlternative[] = [
  {
    brand: "Casio",
    model: "MTG-B3000DN-1A",
    reference: "MTG-B3000DN-1A",
    reason: "too aggressive and visually noisy for the homepage system",
  },
];
