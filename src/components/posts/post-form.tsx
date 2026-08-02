import { useState } from "react";

import { PostImageUploader, type UploadedImage } from "@/components/posts/post-image-uploader";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Neighborhood, PostType } from "@/features/neighborhoods/types";
import { postTypeLabels } from "@/features/neighborhoods/types";
import { postInputSchema } from "@/features/posts/schemas";

export type PostFormValues = {
  neighborhood_id: string;
  type: PostType;
  title: string;
  body: string;
  starts_at: string;
  location: string;
  capacity: string;
  price: string;
  is_free: boolean;
  condition: string;
  needed_by: string;
  slots: string;
  images: UploadedImage[];
};

export const emptyPostForm = (neighborhoodId = "", type: PostType = "plan"): PostFormValues => ({
  neighborhood_id: neighborhoodId,
  type,
  title: "",
  body: "",
  starts_at: "",
  location: "",
  capacity: "",
  price: "",
  is_free: false,
  condition: "",
  needed_by: "",
  slots: "",
  images: [],
});

const typeHints: Record<PostType, string> = {
  plan: "Something happening soon that neighbors can join.",
  marketplace: "Something you're selling, lending or giving away.",
  volunteer: "Help you need from people nearby.",
};

export function PostForm({
  userId,
  neighborhoods,
  values,
  onChange,
  onSubmit,
  submitting,
  submitLabel,
  lockType = false,
}: {
  userId: string;
  neighborhoods: Neighborhood[];
  values: PostFormValues;
  onChange: (next: PostFormValues) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
  lockType?: boolean;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = postInputSchema.safeParse({
      ...values,
      image_paths: values.images.map((image) => image.path),
    });

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
    onSubmit();
  }

  const error = (key: string) =>
    errors[key] ? <p className="mt-1 text-xs text-destructive">{errors[key]}</p> : null;

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="neighborhood">Neighborhood</Label>
          <Select
            value={values.neighborhood_id}
            onValueChange={(value) => set("neighborhood_id", value)}
          >
            <SelectTrigger id="neighborhood" className="mt-1.5">
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
          {error("neighborhood_id")}
        </div>

        <div>
          <Label htmlFor="type">Kind of post</Label>
          <Select
            value={values.type}
            disabled={lockType}
            onValueChange={(value) => set("type", value as PostType)}
          >
            <SelectTrigger id="type" className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(postTypeLabels) as PostType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {postTypeLabels[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">{typeHints[values.type]}</p>
        </div>
      </div>

      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          className="mt-1.5"
          value={values.title}
          maxLength={120}
          onChange={(event) => set("title", event.target.value)}
        />
        {error("title")}
      </div>

      <div>
        <Label htmlFor="body">Details</Label>
        <Textarea
          id="body"
          className="mt-1.5 min-h-32"
          value={values.body}
          maxLength={4000}
          onChange={(event) => set("body", event.target.value)}
        />
        {error("body")}
      </div>

      {values.type === "plan" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="starts_at">Date and time</Label>
            <Input
              id="starts_at"
              type="datetime-local"
              className="mt-1.5"
              value={values.starts_at}
              onChange={(event) => set("starts_at", event.target.value)}
            />
            {error("starts_at")}
          </div>
          <div>
            <Label htmlFor="location">Meeting spot</Label>
            <Input
              id="location"
              className="mt-1.5"
              value={values.location}
              onChange={(event) => set("location", event.target.value)}
            />
            {error("location")}
          </div>
          <div>
            <Label htmlFor="capacity">Spots (optional)</Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              className="mt-1.5"
              value={values.capacity}
              onChange={(event) => set("capacity", event.target.value)}
            />
            {error("capacity")}
          </div>
        </div>
      ) : null}

      {values.type === "marketplace" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 flex items-center gap-3">
            <Switch
              id="is_free"
              checked={values.is_free}
              onCheckedChange={(checked) => set("is_free", checked)}
            />
            <Label htmlFor="is_free">Give it away for free</Label>
          </div>
          {!values.is_free ? (
            <div>
              <Label htmlFor="price">Price (USD)</Label>
              <Input
                id="price"
                inputMode="decimal"
                className="mt-1.5"
                value={values.price}
                onChange={(event) => set("price", event.target.value)}
              />
              {error("price")}
            </div>
          ) : null}
          <div>
            <Label htmlFor="condition">Condition</Label>
            <Input
              id="condition"
              className="mt-1.5"
              placeholder="Good, well loved, new in box…"
              value={values.condition}
              onChange={(event) => set("condition", event.target.value)}
            />
            {error("condition")}
          </div>
        </div>
      ) : null}

      {values.type === "volunteer" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="needed_by">Needed by</Label>
            <Input
              id="needed_by"
              type="datetime-local"
              className="mt-1.5"
              value={values.needed_by}
              onChange={(event) => set("needed_by", event.target.value)}
            />
            {error("needed_by")}
          </div>
          <div>
            <Label htmlFor="slots">People needed</Label>
            <Input
              id="slots"
              type="number"
              min={1}
              className="mt-1.5"
              value={values.slots}
              onChange={(event) => set("slots", event.target.value)}
            />
            {error("slots")}
          </div>
        </div>
      ) : null}

      <div>
        <Label>Photos</Label>
        <div className="mt-1.5">
          <PostImageUploader
            userId={userId}
            images={values.images}
            onChange={(images) => set("images", images)}
          />
        </div>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

/** Turns form state into the payload the server function validates. */
export function toPostPayload(values: PostFormValues) {
  return {
    neighborhood_id: values.neighborhood_id,
    type: values.type,
    title: values.title,
    body: values.body,
    image_paths: values.images.map((image) => image.path),
    starts_at: values.starts_at,
    location: values.location,
    capacity: values.capacity,
    price: values.price,
    is_free: values.is_free,
    condition: values.condition,
    needed_by: values.needed_by,
    slots: values.slots,
  };
}
