import type { UpcomingEditorialStory } from "@/modules/journal/domain/read-models";

export const upcomingEditorialStories: UpcomingEditorialStory[] = [
  {
    id: "watch-size-and-wrist",
    number: "01",
    category: "ВЫБОР",
    title: "Как выбрать размер часов под запястье",
    description: "Разбираемся, как диаметр, толщина и форма корпуса влияют на посадку.",
    status: "upcoming",
  },
  {
    id: "sapphire-or-mineral-crystal",
    number: "02",
    category: "МАТЕРИАЛЫ",
    title: "Сапфировое или минеральное стекло",
    description: "Практическая разница в устойчивости, ремонте и ежедневной носке.",
    status: "upcoming",
  },
  {
    id: "quartz-mechanical-or-solar",
    number: "03",
    category: "МЕХАНИЗМЫ",
    title: "Кварц, механика или solar",
    description: "Сравним три подхода к точности, обслуживанию и характеру часов.",
    status: "upcoming",
  },
];
