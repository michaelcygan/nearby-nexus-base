import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageContainer } from "@/components/layout/app-shell";

const title = "Privacy — Neighborhood Today";
const description =
  "What Neighborhood Today collects, what stays private, and how neighborhood scan counts work.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <AppShell>
      <PageContainer>
        <h1 className="text-3xl sm:text-4xl">Privacy</h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          This page is maintained by the Neighborhood Today team to explain, in plain terms, what
          the product does with your information. It is a description of the app's behavior, not a
          certification.
        </p>

        <div className="mt-8 space-y-6">
          <section>
            <h2 className="text-lg">What is public</h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              Neighborhood pages, posts, directory places, and the display name and photo on your
              profile are readable by anyone with the link, including people without an account.
              Assume anything you publish can be seen by your whole neighborhood.
            </p>
          </section>
          <section>
            <h2 className="text-lg">What stays private</h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              Your email address, saved neighborhoods, saved posts, and the conversations you have
              about a post are visible only to you and — for a conversation — the one other person
              in it. Reports are visible only to moderators; the person you reported is not told who
              reported them.
            </p>
          </section>
          <section>
            <h2 className="text-lg">NFC and QR access points</h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              Physical stickers and signs point to a short link. When one is opened we increment a
              daily count for that sticker so we know which ones are worth keeping. We do not store
              your IP address, device identifier, or account against a scan, so scan counts can
              never be traced back to a person.
            </p>
          </section>
          <section>
            <h2 className="text-lg">Store orders</h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              Merch payments are handled by our payment provider on their own systems. Card numbers
              never reach Neighborhood Today. We keep your order, shipping address, and fulfillment
              status so we can send you the thing you bought.
            </p>
          </section>
          <section>
            <h2 className="text-lg">Deleting your account</h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              You can remove your own posts at any time. To delete your account and profile, email
              the address on the guidelines page and we'll remove it, keeping only records we're
              required to retain for completed orders.
            </p>
          </section>
        </div>
      </PageContainer>
    </AppShell>
  );
}
