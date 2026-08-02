import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "This didn't load",
  description = "Something went wrong on our end. Try again in a moment.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-md border border-border bg-card px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <div className="mt-5 flex justify-center">
          <Button onClick={onRetry}>Try again</Button>
        </div>
      ) : null}
    </div>
  );
}
