import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageContainer } from "@/components/layout/app-shell";

const title = "Terms — Neighborhood Today";
const description =
  "The terms for using Neighborhood Today: your content, neighbor exchanges, merch orders, and account removal.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Terms,
});

const sections = [
  {
    heading: "Using the service",
    body: "You need to be old enough to form a contract where you live, and you're responsible for what you post from your account. Following the community guidelines is part of these terms.",
  },
  {
    heading: "Your content",
    body: "You keep ownership of what you post. You give Neighborhood Today permission to display it in the neighborhood you posted it to, and to keep showing it until it expires or you remove it.",
  },
  {
    heading: "Exchanges between neighbors",
    body: "Plans, marketplace listings, and volunteer offers are arrangements between neighbors. Neighborhood Today does not verify items, hold funds, transport goods, or take responsibility for how a meeting goes.",
  },
  {
    heading: "Merch orders",
    body: "Merch sold in the Store is sold by Neighborhood Today and paid for through our payment provider. Prices are shown at checkout and an order is only confirmed once payment clears.",
  },
  {
    heading: "Moderation and removal",
    body: "We may remove content or suspend an account that breaks the guidelines. If we remove something of yours, you'll be able to see that it was removed.",
  },
  {
    heading: "No warranty",
    body: "The service is provided as it is. We work to keep it available and accurate, but we can't promise it will never be down or never contain a mistake.",
  },
];

function Terms() {
  return (
    <AppShell>
      <PageContainer>
        <h1 className="text-3xl sm:text-4xl">Terms</h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          Plain-language terms for using Neighborhood Today.
        </p>
        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg">{section.heading}</h2>
              <p className="mt-1 max-w-prose text-sm text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </PageContainer>
    </AppShell>
  );
}
