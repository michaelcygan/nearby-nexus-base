import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { blockNeighbor, unblockNeighbor } from "@/features/moderation/block.functions";
import { myBlockedIdsQuery } from "@/features/moderation/queries";
import { useSession } from "@/hooks/use-session";

/**
 * Blocking is private and one-directional in the UI: the blocked neighbor is
 * never told. Their board posts get muted for the blocker and neither side can
 * open a new conversation with the other.
 */
export function BlockButton({ neighborId }: { neighborId: string }) {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const blocked = useQuery({ ...myBlockedIdsQuery(), enabled: Boolean(session) });

  const isSelf = session?.user.id === neighborId;
  const isBlocked = blocked.data?.blockedIds.includes(neighborId) ?? false;

  const mutation = useMutation({
    mutationFn: () =>
      isBlocked
        ? unblockNeighbor({ data: { neighborId } })
        : blockNeighbor({ data: { neighborId } }),
    onSuccess: (result) => {
      toast.success(result.blocked ? "Blocked. You won't see them around." : "Block removed.");
      void queryClient.invalidateQueries({ queryKey: ["moderation"] });
      void queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
    onError: (error: Error) => toast.error(error.message || "That didn't go through."),
  });

  if (!session || isSelf) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      disabled={mutation.isPending || blocked.isLoading}
      onClick={() => mutation.mutate()}
    >
      {isBlocked ? "Unblock" : "Block"}
    </Button>
  );
}
