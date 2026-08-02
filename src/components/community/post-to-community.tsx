import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { composerActions } from "@/features/neighborhoods/types";
import { useSession } from "@/hooks/use-session";

/**
 * One prominent way onto the board. Signed-out neighbors keep their return path
 * and their intended action through sign-in, so they land back here — not on a
 * profile page.
 */
export function PostToCommunity({
  slug,
  name,
  size = "default",
}: {
  slug: string;
  name: string;
  size?: "default" | "sm";
}) {
  const { session } = useSession();
  const boardPath = `/${slug}`;

  // The trigger renders on the server too, so the board's one call to action is
  // in the first paint. Only the destination depends on the session, and the
  // menu contents are read after hydration.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} className="shrink-0">
          <span className="sm:hidden">Post</span>
          <span className="hidden sm:inline">Post to {name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {composerActions.map((action) => (
          <DropdownMenuItem key={action.type} asChild>
            {session ? (
              <Link to="/post/new" search={{ n: slug, type: action.type, returnTo: boardPath }}>
                {action.label}
              </Link>
            ) : (
              <Link to="/auth" search={{ redirect: boardPath, action: action.type }}>
                {action.label}
              </Link>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
