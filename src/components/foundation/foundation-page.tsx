import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Container } from "@/components/ui/container";

export function FoundationPage({
  eyebrow,
  title,
  description,
  stateTitle,
  stateDescription,
}: Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  stateTitle: string;
  stateDescription: string;
}>) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <Container className="pb-14">
        <EmptyState title={stateTitle} description={stateDescription} />
      </Container>
    </>
  );
}
