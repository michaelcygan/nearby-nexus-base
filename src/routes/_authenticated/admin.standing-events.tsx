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
import { myAdminStatusQuery } from "@/features/directory/queries";
import { neighborhoodsQuery } from "@/features/neighborhoods/queries";
import {
  deleteStandingEvent,
  discoverStandingEventImages,
  saveStandingEvent,
  setStandingEventStatus,
  verifyStandingEvent,
  verifyStandingEventImage,
} from "@/features/standing-events/admin.functions";
import { adminStandingEventsQuery } from "@/features/standing-events/queries";
import { standingEventInputSchema } from "@/features/standing-events/schemas";
import { cadenceLabelFor } from "@/features/standing-events/recurrence";
import {
  isStaleVerification,
  standingEventCategories,
  standingEventCategoryLabels,
  weekdayShortNames,
  type StandingEvent,
  type StandingEventCategory,
} from "@/features/standing-events/types";

const UNASSIGNED = "unassigned";

type FormValues = {
  source_key: string;
  venue_name: string;
  venue_address: string;
  title: string;
  description: string;
  category: StandingEventCategory;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  end_day_offset: boolean;
  timezone: string;
  source_url: string;
  image_url: string;
  image_attribution: string;
  exception_note: string;
  starts_on: string;
  ends_on: string;
  excluded_dates: string;
  status: "draft" | "active" | "paused";
};

const emptyEvent: FormValues = {
  source_key: "",
  venue_name: "",
  venue_address: "",
  title: "",
  description: "",
  category: "trivia",
  days_of_week: [],
  start_time: "19:00",
  end_time: "",
  end_day_offset: false,
  timezone: "America/Chicago",
  source_url: "",
  image_url: "",
  image_attribution: "",
  exception_note: "",
  starts_on: "",
  ends_on: "",
  excluded_dates: "",
  status: "draft",
};

function toForm(event: StandingEvent): FormValues {
  return {
    source_key: event.source_key,
    venue_name: event.venue_name,
    venue_address: event.venue_address ?? "",
    title: event.title,
    description: event.description ?? "",
    category: event.category,
    days_of_week: event.days_of_week,
    start_time: event.start_time.slice(0, 5),
    end_time: event.end_time ? event.end_time.slice(0, 5) : "",
    end_day_offset: (event.end_day_offset ?? 0) === 1,
    timezone: event.timezone,
    source_url: event.source_url,
    image_url: event.image_url ?? "",
    image_attribution: event.image_attribution ?? "",
    exception_note: event.exception_note ?? "",
    starts_on: event.starts_on ?? "",
    ends_on: event.ends_on ?? "",
    excluded_dates: event.excluded_dates.join(", "),
    status: event.status,
  };
}

function toPayload(values: FormValues, neighborhoodId: string | null) {
  const blankToNull = (value: string) => (value.trim() ? value.trim() : null);
  return {
    source_key: values.source_key.trim(),
    neighborhood_id: neighborhoodId,
    place_id: null,
    venue_name: values.venue_name.trim(),
    venue_address: blankToNull(values.venue_address),
    title: values.title.trim(),
    description: blankToNull(values.description),
    category: values.category,
    days_of_week: values.days_of_week,
    start_time: values.start_time,
    end_time: blankToNull(values.end_time),
    end_day_offset: values.end_day_offset ? 1 : 0,
    timezone: values.timezone.trim(),
    source_url: values.source_url.trim(),
    image_url: blankToNull(values.image_url),
    image_attribution: blankToNull(values.image_attribution),
    exception_note: blankToNull(values.exception_note),
    starts_on: blankToNull(values.starts_on),
    ends_on: blankToNull(values.ends_on),
    excluded_dates: values.excluded_dates
      .split(",")
      .map((date) => date.trim())
      .filter(Boolean),
    status: values.status,
  };
}

const META_DESCRIPTION =
  "Admin tools for curating recurring neighborhood events hosted at local venues.";

export const Route = createFileRoute("/_authenticated/admin/standing-events")({
  head: () => ({
    meta: [
      { title: "Standing events — Neighborhood Today" },
      { name: "description", content: META_DESCRIPTION },
      { property: "og:title", content: "Standing events — Neighborhood Today" },
      { property: "og:description", content: META_DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminStandingEventsPage,
  errorComponent: () => (
    <AppShell>
      <PageContainer>
        <ErrorState title="Standing event tools didn't load" />
      </PageContainer>
    </AppShell>
  ),
});

function AdminStandingEventsPage() {
  const queryClient = useQueryClient();
  const admin = useQuery(myAdminStatusQuery());
  const { data: neighborhoods } = useSuspenseQuery(neighborhoodsQuery());
  const [boardValue, setBoardValue] = useState(neighborhoods[0]?.id ?? UNASSIGNED);
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "verified" | "stale">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<FormValues>(emptyEvent);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [discoveredImages, setDiscoveredImages] = useState<string[] | null>(null);
  const [discovering, setDiscovering] = useState(false);

  const neighborhoodId = boardValue === UNASSIGNED ? null : boardValue;

  const events = useQuery({
    ...adminStandingEventsQuery(neighborhoodId),
    enabled: admin.data?.isAdmin === true,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin-standing-events"] });
    queryClient.invalidateQueries({ queryKey: ["standing-events"] });
  }

  function reset() {
    setEditingId(null);
    setValues(emptyEvent);
    setErrors({});
  }

  const save = useMutation({
    mutationFn: async () =>
      saveStandingEvent({
        data: {
          eventId: editingId,
          values: standingEventInputSchema.parse(toPayload(values, neighborhoodId)),
        },
      }),
    onSuccess: () => {
      refresh();
      reset();
      toast.success("Standing event saved.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "That event couldn't be saved."),
  });

  const changeStatus = useMutation({
    mutationFn: (input: { eventId: string; status: "draft" | "active" | "paused" }) =>
      setStandingEventStatus({ data: input }),
    onSuccess: () => {
      refresh();
      toast.success("Status updated.");
    },
    onError: () => toast.error("That status couldn't be changed."),
  });

  const verify = useMutation({
    mutationFn: (eventId: string) => verifyStandingEvent({ data: { eventId } }),
    onSuccess: () => {
      refresh();
      toast.success("Marked verified today.");
    },
    onError: () => toast.error("That event couldn't be marked verified."),
  });

  const verifyImage = useMutation({
    mutationFn: (eventId: string) => verifyStandingEventImage({ data: { eventId } }),
    onSuccess: () => {
      refresh();
      toast.success("Image approved.");
    },
    onError: () => toast.error("That image couldn't be approved."),
  });

  const discover = useMutation({
    mutationFn: (sourceUrl: string) => discoverStandingEventImages({ data: { sourceUrl } }),
    onSuccess: (result) => {
      setDiscoveredImages(result.candidates);
      toast.success(
        result.candidates.length
          ? `Found ${result.candidates.length} image${result.candidates.length === 1 ? "" : "s"}.`
          : "No images found on that page.",
      );
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Image discovery failed."),
  });

  const remove = useMutation({
    mutationFn: (eventId: string) => deleteStandingEvent({ data: { eventId } }),
    onSuccess: () => {
      refresh();
      reset();
      toast.success("Standing event removed.");
    },
    onError: () => toast.error("That event couldn't be removed."),
  });

  const handleDiscoverImages = async (sourceUrl: string) => {
    if (!sourceUrl) return;
    setDiscovering(true);
    setDiscoveredImages(null);
    try {
      await discover.mutateAsync(sourceUrl);
    } finally {
      setDiscovering(false);
    }
  };

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
            description="Standing events are curated by hand. If you host a recurring night at a local venue, reach out through the community guidelines page."
          />
        </PageContainer>
      </AppShell>
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = standingEventInputSchema.safeParse(toPayload(values, neighborhoodId));
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

  function toggleDay(day: number) {
    setValues((current) => ({
      ...current,
      days_of_week: current.days_of_week.includes(day)
        ? current.days_of_week.filter((value) => value !== day)
        : [...current.days_of_week, day].sort((a, b) => a - b),
    }));
  }

  const fieldError = (key: keyof FormValues) =>
    errors[key] ? <p className="mt-1 text-xs text-destructive">{errors[key]}</p> : null;

  return (
    <AppShell>
      <PageContainer>
        <h1 className="text-3xl">Standing events</h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          Recurring nights hosted by local venues — trivia, karaoke, bingo, drag, live music. Each
          entry links out to the venue's own page, so keep the source link and verification date
          current.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:items-end">
          <div>
            <Label htmlFor="board">Board</Label>
            <Select
              value={boardValue}
              onValueChange={(value) => {
                setBoardValue(value);
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
                <SelectItem value={UNASSIGNED}>Unassigned (held drafts)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="verified-filter">Verification</Label>
            <Select
              value={verifiedFilter}
              onValueChange={(value) => setVerifiedFilter(value as typeof verifiedFilter)}
            >
              <SelectTrigger id="verified-filter" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                <SelectItem value="verified">Verified within 30 days</SelectItem>
                <SelectItem value="stale">Needs a re-check</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 max-w-2xl space-y-4">
          <h2 className="text-xl">{editingId ? "Edit standing event" : "Add a standing event"}</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="venue_name">Venue</Label>
              <Input
                id="venue_name"
                className="mt-1.5"
                value={values.venue_name}
                onChange={(event) => setValues({ ...values, venue_name: event.target.value })}
              />
              {fieldError("venue_name")}
            </div>
            <div>
              <Label htmlFor="title">Event title</Label>
              <Input
                id="title"
                className="mt-1.5"
                value={values.title}
                onChange={(event) => setValues({ ...values, title: event.target.value })}
              />
              {fieldError("title")}
            </div>
            <div>
              <Label htmlFor="source_key">Source key</Label>
              <Input
                id="source_key"
                className="mt-1.5"
                placeholder="venue-name-trivia-tuesday"
                value={values.source_key}
                onChange={(event) => setValues({ ...values, source_key: event.target.value })}
              />
              {fieldError("source_key")}
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={values.category}
                onValueChange={(value) =>
                  setValues({ ...values, category: value as StandingEventCategory })
                }
              >
                <SelectTrigger id="category" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {standingEventCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {standingEventCategoryLabels[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="venue_address">Venue address</Label>
              <Input
                id="venue_address"
                className="mt-1.5"
                value={values.venue_address}
                onChange={(event) => setValues({ ...values, venue_address: event.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                className="mt-1.5"
                rows={3}
                value={values.description}
                onChange={(event) => setValues({ ...values, description: event.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Days of the week</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {weekdayShortNames.map((label, day) => {
                const active = values.days_of_week.includes(day);
                return (
                  <Button
                    key={label}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => toggleDay(day)}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
            {fieldError("days_of_week")}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="start_time">Start time</Label>
              <Input
                id="start_time"
                type="time"
                className="mt-1.5"
                value={values.start_time}
                onChange={(event) => setValues({ ...values, start_time: event.target.value })}
              />
              {fieldError("start_time")}
            </div>
            <div>
              <Label htmlFor="end_time">End time (optional)</Label>
              <Input
                id="end_time"
                type="time"
                className="mt-1.5"
                value={values.end_time}
                onChange={(event) => setValues({ ...values, end_time: event.target.value })}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={values.end_day_offset}
                  onChange={(event) =>
                    setValues({ ...values, end_day_offset: event.target.checked })
                  }
                />
                Ends after midnight
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="source_url">Source link (venue page)</Label>
              <Input
                id="source_url"
                className="mt-1.5"
                placeholder="https://"
                value={values.source_url}
                onChange={(event) => setValues({ ...values, source_url: event.target.value })}
              />
              {fieldError("source_url")}
            </div>
            <div>
              <Label htmlFor="timezone">Time zone</Label>
              <Input
                id="timezone"
                className="mt-1.5"
                value={values.timezone}
                onChange={(event) => setValues({ ...values, timezone: event.target.value })}
              />
              {fieldError("timezone")}
            </div>
            <div className="relative">
              <Label htmlFor="image_url">Image URL (optional)</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="image_url"
                  className="flex-1"
                  placeholder="https://"
                  value={values.image_url}
                  onChange={(event) => setValues({ ...values, image_url: event.target.value })}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleDiscoverImages(values.source_url)}
                  disabled={discovering || !values.source_url}
                >
                  {discovering ? "Looking…" : "Discover"}
                </Button>
              </div>
              {fieldError("image_url")}
              {discoveredImages && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {discoveredImages.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setValues({ ...values, image_url: url })}
                      className="group relative overflow-hidden rounded border border-border text-left"
                    >
                      <img
                        src={url}
                        alt="Discovered image"
                        className="h-24 w-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                        Use this image
                      </span>
                    </button>
                  ))}
                  {discoveredImages.length === 0 && (
                    <p className="col-span-3 text-sm text-muted-foreground">
                      No images found on that page.
                    </p>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="image_attribution">Image credit (optional)</Label>
              <Input
                id="image_attribution"
                className="mt-1.5"
                value={values.image_attribution}
                onChange={(event) =>
                  setValues({ ...values, image_attribution: event.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="starts_on">First date (optional)</Label>
              <Input
                id="starts_on"
                type="date"
                className="mt-1.5"
                value={values.starts_on}
                onChange={(event) => setValues({ ...values, starts_on: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="ends_on">Last date (optional)</Label>
              <Input
                id="ends_on"
                type="date"
                className="mt-1.5"
                value={values.ends_on}
                onChange={(event) => setValues({ ...values, ends_on: event.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="excluded_dates">Skipped dates (comma separated)</Label>
              <Input
                id="excluded_dates"
                className="mt-1.5"
                placeholder="2026-12-24, 2026-12-31"
                value={values.excluded_dates}
                onChange={(event) => setValues({ ...values, excluded_dates: event.target.value })}
              />
              {fieldError("excluded_dates")}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="exception_note">Exception note (optional)</Label>
              <Input
                id="exception_note"
                className="mt-1.5"
                placeholder="No trivia on holiday weekends."
                value={values.exception_note}
                onChange={(event) => setValues({ ...values, exception_note: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={values.status}
                onValueChange={(value) =>
                  setValues({ ...values, status: value as FormValues["status"] })
                }
              >
                <SelectTrigger id="status" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" disabled={save.isPending}>
              {editingId ? "Save changes" : "Add event"}
            </Button>
            {editingId ? (
              <Button type="button" variant="ghost" onClick={reset}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        <section className="mt-12">
          <h2 className="text-xl">
            {neighborhoodId ? "Events on this board" : "Held drafts (no board yet)"}
          </h2>

          {events.isLoading ? (
            <p className="mt-4 text-muted-foreground">Loading events…</p>
          ) : (events.data ?? []).length === 0 ? (
            <p className="mt-4 text-muted-foreground">Nothing curated here yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {(events.data ?? [])
                .filter((event) => {
                  if (verifiedFilter === "all") return true;
                  const stale = isStaleVerification(event.last_verified_at);
                  if (verifiedFilter === "stale") return stale;
                  return !stale;
                })
                .map((event) => {
                  const stale = isStaleVerification(event.last_verified_at);
                  const imageStale = isStaleVerification(event.image_verified_at);
                  return (
                    <li key={event.id} className="py-4">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <h3 className="text-base">{event.title}</h3>
                        <span className="text-sm text-muted-foreground">{event.venue_name}</span>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {event.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {cadenceLabelFor({
                          ...event,
                          origin: { slug: "", name: "", isNearby: false },
                        })}
                        {" · "}
                        {standingEventCategoryLabels[event.category]}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.last_verified_at
                          ? `Verified ${event.last_verified_at}`
                          : "Never verified"}
                        {stale ? " — needs a re-check" : ""}
                        {event.image_url
                          ? ` · Image ${event.image_verified_at ? event.image_verified_at : "unapproved"}`
                          : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm">
                        <button
                          type="button"
                          className="underline underline-offset-4"
                          onClick={() => {
                            setEditingId(event.id);
                            setValues(toForm(event));
                            setErrors({});
                            setDiscoveredImages(null);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="underline underline-offset-4"
                          onClick={() => verify.mutate(event.id)}
                        >
                          Mark verified
                        </button>
                        {event.image_url && imageStale ? (
                          <button
                            type="button"
                            className="underline underline-offset-4"
                            onClick={() => verifyImage.mutate(event.id)}
                          >
                            Approve image
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="underline underline-offset-4"
                          onClick={() =>
                            changeStatus.mutate({
                              eventId: event.id,
                              status: event.status === "active" ? "paused" : "active",
                            })
                          }
                        >
                          {event.status === "active" ? "Pause" : "Make active"}
                        </button>
                        <a
                          href={event.source_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="underline underline-offset-4"
                        >
                          Open source
                        </a>
                        <button
                          type="button"
                          className="text-destructive underline underline-offset-4"
                          onClick={() => remove.mutate(event.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </section>
      </PageContainer>
    </AppShell>
  );
}
