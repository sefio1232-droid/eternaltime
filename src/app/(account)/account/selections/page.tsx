import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AccountSelectionsPage() {
  return (
    <FoundationPage
      eyebrow="Аккаунт"
      title="История подборов"
      description="Foundation route для будущих structured selection sessions."
      stateTitle="Подборы ещё не сохраняются"
      stateDescription="Selection session persistence появится после catalog foundation."
    />
  );
}
