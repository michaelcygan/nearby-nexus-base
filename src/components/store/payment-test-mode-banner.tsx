const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

/** Renders nothing once live payments are configured. */
export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        Checkout isn't set up for real payments yet. Finish the payment go-live steps to start
        selling.
      </p>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
        Test mode — payments made here aren't real charges.{" "}
        <a
          href="https://docs.lovable.dev/features/payments#test-and-live-environments"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          Read more
        </a>
      </p>
    );
  }
  return null;
}
