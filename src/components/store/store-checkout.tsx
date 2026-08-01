import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useCallback } from "react";

import { createStoreCheckout } from "@/features/store/store.functions";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";

export function StoreCheckout({ listingId }: { listingId: string }) {
  const fetchClientSecret = useCallback(async () => {
    const result = await createStoreCheckout({
      data: {
        listingId,
        returnUrl: `${window.location.origin}/store/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Checkout could not be started.");
    return result.clientSecret;
  }, [listingId]);

  return (
    <div id="checkout" className="mt-4">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
