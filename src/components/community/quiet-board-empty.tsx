import { Link } from "@tanstack/react-router";

import { useSession } from "@/hooks/use-session";

/**
 * The compact, honest Today empty state. Roughly half the height of the shared
 * dashed EmptyState, and it never puts a second large Post button in the same
 * viewport as the masthead — a quiet text action is enough.
 */
export function QuietBoardEmpty({ slug }: { slug: string }) {
  const { session } = useSession();
  const boardPath = `/${slug}`;

  return (
    <div className="border-y border-border py-5">
      <p className="font-display text-base font-semibold">Nothing posted yet today.</p>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        Be the first to add a plan, offer something, or ask for a hand.{" "}
        {session ? (
          <Link
            to="/post/new"
            search={{ n: slug, returnTo: boardPath }}
            className="text-foreground underline underline-offset-4"
          >
            Start a post
          </Link>
        ) : (
          <Link
            to="/auth"
            search={{ redirect: boardPath }}
            className="text-foreground underline underline-offset-4"
          >
            Start a post
          </Link>
        )}
      </p>
    </div>
  );
}
