import type { Metadata } from "next";
import { Suspense } from "react";
import { UserRoundX } from "lucide-react";
import { format, getDictionary, getLocale, type Dictionary, type Locale } from "@/i18n";
import { getMessages, requireRole } from "@/lib/dal";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { MessageThread } from "@/components/advising/message-thread";
import { RefreshOnce } from "@/components/advising/refresh-once";
import { AdvisorCard } from "@/components/advising/advisor-card";
import { firstName } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).messages.title };
}

/** The student's conversation with their academic advisor. Opening it marks the advisor's messages as read. */
export default async function MessagesPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Messages locale={locale} dict={dict} />
    </Suspense>
  );
}

async function Messages({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  await requireRole("student");
  const thread = await getMessages();
  const t = dict.messages;
  // Were any of the advisor's messages unread before this visit? (The API marked them read just now.)
  const hadUnread = thread.messages.some((m) => m.sender === "advisor" && m.read_at === null);

  return (
    <div className="space-y-6">
      <RefreshOnce when={hadUnread} />
      <PageHeader
        title={t.title}
        subtitle={thread.advisor ? format(t.withAdvisor, { name: thread.advisor.full_name }) : t.subtitle}
      />
      {thread.advisor && <AdvisorCard advisor={thread.advisor} t={t} />}
      {thread.advisor ? (
        <section className="card">
          <MessageThread
            messages={thread.messages}
            viewer="student"
            otherName={firstName(thread.advisor.full_name)}
            locale={locale}
            t={t}
            errors={dict.errors}
          />
        </section>
      ) : (
        <EmptyState icon={UserRoundX} title={t.noAdvisor} />
      )}
    </div>
  );
}
