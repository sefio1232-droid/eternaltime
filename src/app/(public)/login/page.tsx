import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/modules/auth/server";
import { safeReturnPath } from "@/modules/auth/return-path";
import { requestMagicLinkAction } from "@/app/(public)/login/actions";

export const metadata: Metadata = {
  title: "Войти",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type LoginPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const returnTo = safeReturnPath(
    typeof params.next === "string" ? params.next : typeof params.returnTo === "string" ? params.returnTo : null,
    "/collection",
  );
  const currentUser = await getCurrentUser();
  if (currentUser.user) {
    redirect(returnTo);
  }

  const sent = params.sent === "1";
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <Container className="max-w-3xl py-12 lg:py-16">
      <div className="grid gap-8 border-t border-[var(--border-strong)] pt-8 md:grid-cols-[0.75fr_1.25fr]">
        <div>
          <p className="type-label">Личное пространство</p>
          <h1 className="type-page mt-3 text-4xl text-balance">Войти в Eternal Time</h1>
        </div>
        <div className="grid gap-6">
          <p className="type-body text-[var(--text-muted)]">
            Мы отправим одноразовую ссылку на почту. После входа вы вернётесь туда, где остановились.
          </p>

          {sent ? (
            <p className="border-y border-[var(--border)] py-4 text-sm">
              Ссылка отправлена. Откройте письмо в этом браузере, чтобы продолжить.
            </p>
          ) : (
            <form action={requestMagicLinkAction} className="grid gap-4">
              <input type="hidden" name="returnTo" value={returnTo} />
              <input type="hidden" name="next" value={returnTo} />
              <label className="grid gap-2 text-sm font-semibold">
                Email
                <input
                  required
                  type="email"
                  name="email"
                  autoComplete="email"
                  className="control-surface w-full px-3"
                  placeholder="name@example.com"
                />
              </label>
              <label className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 text-sm leading-6 text-[var(--text-muted)]">
                <input
                  required
                  type="checkbox"
                  name="personalDataConsentAccepted"
                  className="mt-1 size-4 accent-[var(--surface-graphite)]"
                />
                <span>
                  Я даю <Link href="/legal/personal-data-consent" className="underline underline-offset-4">согласие на обработку персональных данных</Link> и
                  ознакомлен(а) с <Link href="/legal/privacy" className="underline underline-offset-4">Политикой обработки персональных данных</Link>.
                </span>
              </label>
              <Button type="submit" className="justify-self-start">Продолжить</Button>
            </form>
          )}

          {error ? (
            <p className="text-sm text-[var(--danger)]">
              {error === "unconfigured"
                ? "Вход пока не настроен для этого окружения."
                : error === "invalid_email"
                  ? "Проверьте адрес электронной почты."
                  : error === "personal_data_consent_required"
                    ? "Для входа необходимо согласие на обработку персональных данных."
                  : "Не удалось отправить ссылку. Попробуйте ещё раз."}
            </p>
          ) : null}
        </div>
      </div>
    </Container>
  );
}
