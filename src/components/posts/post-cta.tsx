import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import type { PostType } from "@/features/neighborhoods/types";
import { useSession } from "@/hooks/use-session";

const labels: Record<PostType, string> = {
  plan: "Post a plan",
  marketplace: "List an item",
  volunteer: "Ask for help",
};

export function PostCta({ slug, type }: { slug: string; type: PostType }) {
  const { session, loading } = useSession();

  if (loading) return <span className="h-9" aria-hidden />;

  if (!session) {
    return (
      <Button asChild size="sm" variant="outline">
        <Link to="/auth">Sign in to post</Link>
      </Button>
    );
  }

  return (
    <Button asChild size="sm">
      <Link to="/post/new" search={{ n: slug, type }}>
        {labels[type]}
      </Link>
    </Button>
  );
}
