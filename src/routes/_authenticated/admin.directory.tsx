import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { AppShell, PageContainer } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminPlacesQuery, myAdminStatusQuery } from "@/features/directory/queries";
import { createPlace, deletePlace, updatePlace } from "@/features/directory/place.functions";
import { neighborhoodsQuery } from "@/features/neighborhoods/queries";
import { placeInputSchema } from "@/features/posts/schemas";

type PlaceFormValues = {
  name: string;
  category: string;
  address: string;
  description: string;
  website: string;
  phone: string;
  hours: string;
};

const emptyPlace: PlaceFormValues = {
  name: "",
  category: "",
  address: "",
  description: "",
  website: "",
  phone: "",
  hours: "",
};

export const Route = createFileRoute("/_authenticated/admin/directory")({
  head: () => ({
    meta: [
      { title: "Directory listings — Neighborhood Today" },
      {
        name: "description",
        content: "Admin tools for curating vetted directory listings on each neighborhood board.",
      },
      { property: "og:title", content: "Directory listings — Neighborhood Today" },
      {
        property: "og:description",
        content: "Admin tools for curating vetted directory listings on each neighborhood board.",
      },
    ],
  }),
  component: AdminDirectoryPage,
  errorComponent: () => (
    <AppShell>
      <PageContainer>
        <ErrorState title="Directory tools didn't load" />
      </PageContainer>
    </AppShell>
  ),
});

function AdminDirectoryPage() {
  const queryClient = useQueryClient();
  const admin = useQuery(myAdminStatusQuery());
  const { data: neighborhoods } = useSuspenseQuery(neighborhoodsQuery());
  const [neighborhoodId, setNeighborhoodId] = useState(neighborhoods[0]?.id ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<PlaceFormValues>(emptyPlace);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const places = useQuery({
    ...adminPlacesQuery(neighborhoodId),
    enabled: Boolean(neighborhoodId) && admin.data?.isAdmin === true,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin-places"] });
    queryClient.invalidateQueries({ queryKey: ["neighborhood"] });
  }

  function reset() {
    setEditingId(null);
    setValues(emptyPlace);
    setErrors({});
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...values, neighborhood_id: neighborhoodId };
      if (editingId) return updatePlace({ data: { placeId: editingId, values: payload } });
      return createPlace({ data: payload });
    },
    onSuccess: () => {
      refresh();
      reset();
      toast.success("Directory listing saved.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "That listing couldn't be saved."),
  });

  const remove = useMutation({
    mutationFn: (placeId: string) => deletePlace({ data: { placeId } }),
    onSuccess: () => {
      refresh();
      toast.success("Listing removed.");
    },
    onError: () => toast.error("That listing couldn't be removed."),
  });

  if (admin.isLoading) {
    return (
      <AppShell>
        <PageContainer>
          <p className="text-muted-foreground">Checking your access…</p>
        </PageContainer>
      </AppShell>
    );
  }

  if (admin.data?.isAdmin !== true) {
    return (
      <AppShell>
        <PageContainer>
          <EmptyState
            title="Admins only"
            description="Directory listings are curated. If you run a local business and want to be listed, reach out through the community guidelines page."
          />
        </PageContainer>
      </AppShell>
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = placeInputSchema.safeParse({ ...values, neighborhood_id: neighborhoodId });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    save.mutate();
  }

  return (
    <AppShell>
      <PageContainer>
        <h1 className="text-3xl">Directory listings</h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          Listings are curated by hand for now, so every entry on a board is one you vetted.
        </p>

        <div className="mt-6 max-w-xs">
          <Label htmlFor="board">Board</Label>
          <Select
            value={neighborhoodId}
            onValueChange={(value) => {
              setNeighborhoodId(value);
              reset();
            }}
          >
            <SelectTrigger id="board" className="mt-1.5">
              <SelectValue placeholder="Pick a board" />
            </SelectTrigger>
            <SelectContent>
              {neighborhoods.map((neighborhood) => (
                <SelectItem key={neighborhood.id} value={neighborhood.id}>
                  {neighborhood.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <form onSubmit={submit} className="mt-8 max-w-xl space-y-4">
          <h2 className="text-xl">{editingId ? "Edit listing" : "Add a listing"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                className="mt-1.5"
                value={values.name}
                onChange={(event) => setValues({ ...values, name: event.target.value })}
              />
              {errors["name"] ? (
                <p className="mt-1 text-xs text-destructive">{errors["name"]}</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                className="mt-1.5"
                placeholder="Coffee, hardware, clinic…"
                value={values.category}
                onChange={(event) => setValues({ ...values, category: event.target.value })}
              />
              {errors["category"] ? (
                <p className="mt-1 text-xs text-destructive">{errors["category"]}</p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                className="mt-1.5"
                value={values.address}
                onChange={(event) => setValues({ ...values, address: event.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                className="mt-1.5"
                value={values.description}
                onChange={(event) => setValues({ ...values, description: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                className="mt-1.5"
                value={values.website}
                onChange={(event) => setValues({ ...values, website: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                className="mt-1.5"
                value={values.phone}
                onChange={(event) => setValues({ ...values, phone: event.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="hours">Hours</Label>
              <Input
                id="hours"
                className="mt-1.5"
                value={values.hours}
                onChange={(event) => setValues({ ...values, hours: event.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : editingId ? "Save listing" : "Add listing"}
            </Button>
            {editingId ? (
              <Button type="button" variant="ghost" onClick={reset}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        <section className="mt-10">
          <h2 className="text-xl">Current listings</h2>
          {places.data && places.data.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No listings on this board yet" />
            </div>
          ) : null}
          <ul className="mt-4 space-y-3">
            {(places.data ?? []).map((place) => (
              <li
                key={place.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="font-sans text-xs uppercase tracking-[0.14em] text-primary">
                    {place.category}
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold">{place.name}</p>
                  {place.address ? (
                    <p className="text-sm text-muted-foreground">{place.address}</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(place.id);
                      setValues({
                        name: place.name,
                        category: place.category,
                        address: place.address ?? "",
                        description: place.description ?? "",
                        website: place.website ?? "",
                        phone: place.phone ?? "",
                        hours: place.hours ?? "",
                      });
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(place.id)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </PageContainer>
    </AppShell>
  );
}
