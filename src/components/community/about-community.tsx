/**
 * The community's own description, kept at the very bottom of Today as a
 * disclosure. It is reference material — the board itself should be the first
 * thing a visitor reads.
 */
export function AboutCommunity({ name, about }: { name: string; about: string | null }) {
  if (!about) return null;

  return (
    <section className="border-t border-border pt-6">
      <details className="group">
        <summary className="cursor-pointer list-none font-sans text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          {`About ${name}`}
          <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground group-open:hidden">
            show
          </span>
          <span className="ml-2 hidden font-normal normal-case tracking-normal text-muted-foreground group-open:inline">
            hide
          </span>
        </summary>
        <p className="mt-3 max-w-prose whitespace-pre-line text-sm text-muted-foreground">
          {about}
        </p>
      </details>
    </section>
  );
}
