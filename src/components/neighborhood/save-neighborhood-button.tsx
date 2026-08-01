import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { mySavedNeighborhoodsQuery } from "@/features/account/queries";
import { saveNeighborhood, unsaveNeighborhood } from "@/features/account/profile.functions";
import { useSession } from "@/hooks/use-session";

export function SaveNeighborhoodButton({ neighborhoodId }: { neighborhoodId: string }) {
  const { session, loading } = useSession();
  const queryClient = useQueryClient();
  const saved = useQuery({ ...mySavedNeighborhoodsQuery(), enabled: Boolean(session) });

  const isSaved = (saved.data ?? []).some((row) => row.neighborhood.id === neighborhoodId);

  const toggle = useMutation<{ saved: boolean }, Error>({
    mutationFn: async () =>
      isSaved
        ? unsaveNeighborhood({ data: { neighborhoodId } })
        : saveNeighborhood({ data: { neighborhoodId } }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-saved-neighborhoods"] });
    },
    onError: () => toast.error("Couldn't update your saved neighborhoods."),
  });

  if (loading) return null;

  if (!session) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link to="/auth">Sign in to save</Link>
      </Button>
    );
  }

  return (
    <Button
      variant={isSaved ? "secondary" : "outline"}
      size="sm"
      disabled={toggle.isPending || saved.isPending}
      onClick={() => toggle.mutate()}
    >
      {isSaved ? "Saved" : "Save neighborhood"}
    </Button>
  );
}
