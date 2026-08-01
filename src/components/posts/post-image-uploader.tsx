import { X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MAX_IMAGES, compressImage, formatBytes } from "@/lib/image-compress";

export type UploadedImage = { path: string; url: string };

export function PostImageUploader({
  userId,
  images,
  onChange,
}: {
  userId: string;
  images: UploadedImage[];
  onChange: (next: UploadedImage[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast.error(`You can attach up to ${MAX_IMAGES} photos.`);
      return;
    }

    const next: UploadedImage[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      try {
        setBusy(`Compressing ${file.name}…`);
        const compressed = await compressImage(file);
        setBusy(`Uploading ${file.name} (${formatBytes(compressed.size)})…`);

        const path = `${userId}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage
          .from("post-images")
          .upload(path, compressed, { contentType: "image/jpeg", upsert: false });
        if (error) throw new Error(error.message);

        const { data } = await supabase.storage
          .from("post-images")
          .createSignedUrl(path, 60 * 60);
        next.push({ path, url: data?.signedUrl ?? "" });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "That photo could not be added.");
      }
    }

    setBusy(null);
    if (inputRef.current) inputRef.current.value = "";
    if (next.length > 0) onChange([...images, ...next]);
  }

  async function removeImage(path: string) {
    onChange(images.filter((image) => image.path !== path));
    await supabase.storage.from("post-images").remove([path]);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => void handleFiles(event.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={Boolean(busy) || images.length >= MAX_IMAGES}
          onClick={() => inputRef.current?.click()}
        >
          Add photos
        </Button>
        <p className="text-xs text-muted-foreground">
          {busy ??
            `Up to ${MAX_IMAGES} photos. Each one is resized and compressed in your browser before upload, so the site stays fast and cheap to run.`}
        </p>
      </div>

      {images.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-3">
          {images.map((image) => (
            <li key={image.path} className="relative">
              <img
                src={image.url}
                alt=""
                loading="lazy"
                className="h-20 w-20 rounded-sm border border-border object-cover"
              />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => void removeImage(image.path)}
                className="absolute -right-2 -top-2 rounded-full border border-border bg-background p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
