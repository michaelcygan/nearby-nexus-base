import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { myProfileQuery } from "@/features/account/queries";
import { initialsFor } from "@/features/account/types";
import { myAdminStatusQuery } from "@/features/directory/queries";
import { myModerationRoleQuery } from "@/features/moderation/queries";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

export function AccountMenu() {
  const { session, loading } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const profile = useQuery({ ...myProfileQuery(), enabled: Boolean(session) });
  const admin = useQuery({ ...myAdminStatusQuery(), enabled: Boolean(session) });
  const moderation = useQuery({ ...myModerationRoleQuery(), enabled: Boolean(session) });

  if (loading) {
    return <span className="h-8 w-16" aria-hidden />;
  }

  if (!session) {
    return (
      <Button asChild size="sm" variant="outline">
        <Link to="/auth">Sign in</Link>
      </Button>
    );
  }

  const name = profile.data?.display_name ?? "Neighbor";

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex items-center gap-2 rounded-sm px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="h-7 w-7">
            {profile.data?.avatar_url ? <AvatarImage src={profile.data.avatar_url} alt="" /> : null}
            <AvatarFallback className="text-[11px]">{initialsFor(name)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-24 truncate text-sm sm:inline">{name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link to="/profile">Your profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/posts">Your posts</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/messages">Messages</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/orders">Your orders</Link>
        </DropdownMenuItem>
        {profile.data ? (
          <DropdownMenuItem asChild>
            <Link to="/u/$profileId" params={{ profileId: profile.data.id }}>
              Public neighbor page
            </Link>
          </DropdownMenuItem>
        ) : null}
        {admin.data?.isAdmin ? (
          <DropdownMenuItem asChild>
            <Link to="/admin/directory">Directory listings</Link>
          </DropdownMenuItem>
        ) : null}
        {admin.data?.isAdmin ? (
          <DropdownMenuItem asChild>
            <Link to="/admin/store">Store listings</Link>
          </DropdownMenuItem>
        ) : null}
        {admin.data?.isAdmin ? (
          <DropdownMenuItem asChild>
            <Link to="/admin/access-points">Access points</Link>
          </DropdownMenuItem>
        ) : null}

        {moderation.data?.canModerate ? (
          <DropdownMenuItem asChild>
            <Link to="/admin/moderation">Moderation queue</Link>
          </DropdownMenuItem>
        ) : null}
        {moderation.data?.isAdmin ? (
          <DropdownMenuItem asChild>
            <Link to="/admin/members">Members and roles</Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleSignOut()}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
