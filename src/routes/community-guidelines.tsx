import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageContainer } from "@/components/layout/app-shell";

const title = "Community guidelines — Neighborhood Today";
const description =
  "How neighbors are expected to treat each other on Neighborhood Today, and what gets removed.";

export const Route = createFileRoute("/community-guidelines")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Guidelines,
});

const rules = [
  {
    heading: "Be a neighbor, not an account",
    body: "Use a name people on your block would recognize. No impersonation, no anonymous pile-ons.",
  },
  {
    heading: "Post things that are actually local",
    body: "Plans, listings, and asks should be relevant to the neighborhood you're posting in. National politics, spam, and mass advertising get removed.",
  },
  {
    heading: "Keep it safe",
    body: "No harassment, slurs, threats, or targeting individuals. No weapons, drugs, alcohol, live animals, recalled goods, or anything illegal in the Marketplace.",
  },
  {
    heading: "Handle exchanges carefully",
    body: "Meet in public where you can, bring someone if a meeting feels off, and never share financial details in a conversation. Neighborhood Today does not process neighbor-to-neighbor payments.",
  },
  {
    heading: "Respect the record",
    body: "Directory corrections should be verifiable. Don't edit a business's listing to advertise your own.",
  },
  {
    heading: "Use the tools",
    body: "Report a post instead of arguing with it, and block someone if you'd rather not see them again. Reports go to neighborhood moderators, not to the person you reported.",
  },
];

function Guidelines() {
  return (
    <AppShell>
      <PageContainer>
        <h1 className="text-3xl sm:text-4xl">Community guidelines</h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          Neighborhood Today only works if it stays a place people are comfortable putting their
          real name. These are the rules moderators enforce.
        </p>
        <div className="mt-8 space-y-6">
          {rules.map((rule) => (
            <section key={rule.heading}>
              <h2 className="text-lg">{rule.heading}</h2>
              <p className="mt-1 max-w-prose text-sm text-muted-foreground">{rule.body}</p>
            </section>
          ))}
        </div>
        <section className="rule-print mt-10 pt-6">
          <h2 className="text-lg">What happens when something is reported</h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            A moderator reviews the post and either leaves it up, removes it, or restores it if it
            was removed in error. Removed posts stay visible to their author with a note, so nobody
            is left guessing.
          </p>
        </section>
      </PageContainer>
    </AppShell>
  );
}
