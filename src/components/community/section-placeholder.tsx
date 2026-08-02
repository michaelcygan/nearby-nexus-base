import { SectionHeading } from "@/components/community/section-heading";
import { cn } from "@/lib/utils";

/** One quiet muted bar standing in for a line of text that hasn't arrived. */
export function PlaceholderBar({ className }: { className?: string }) {
  return <span className={cn("block animate-pulse rounded-sm bg-muted", className)} />;
}

/**
 * A reserved slot for an ambient Today section while its data is in flight.
 * Space is held so the board above never jumps when the section lands.
 */
export function SectionPlaceholder({ label, rows = 2 }: { label: string; rows?: number }) {
  return (
    <section className="border-t border-border pt-6" aria-busy="true">
      <SectionHeading>{label}</SectionHeading>
      <div className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="space-y-2 p-4">
            <PlaceholderBar className="h-4 w-2/3" />
            <PlaceholderBar className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </section>
  );
}
