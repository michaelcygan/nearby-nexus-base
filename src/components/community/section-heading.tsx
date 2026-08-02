/** The one section label style used across the community board. */
export function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-primary">
      {children}
    </h2>
  );
}
