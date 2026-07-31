import { Skeleton } from "@/components/ui/skeleton";

export function PostListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="space-y-3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="rounded-md border border-border bg-card p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-5 w-2/3" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
        </li>
      ))}
    </ul>
  );
}
