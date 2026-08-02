import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <p className="font-display text-sm font-semibold">Neighborhood Today</p>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          A quiet, local noticeboard for the block you actually live on.
        </p>
        <nav aria-label="Footer" className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link
            to="/community-guidelines"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Community guidelines
          </Link>
          <Link
            to="/privacy"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Privacy
          </Link>
          <Link
            to="/terms"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
