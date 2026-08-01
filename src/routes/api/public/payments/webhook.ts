import { createFileRoute } from "@tanstack/react-router";

import { markSessionPaid, releaseSession } from "@/features/store/checkout.server";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

type SessionObject = {
  id?: string;
  payment_status?: string;
  payment_intent?: string | { id?: string } | null;
  customer_details?: { email?: string | null } | null;
  metadata?: Record<string, string> | null;
};

async function handleEvent(event: { type: string; data: { object: Record<string, unknown> } }) {
  const session = event.data.object as SessionObject;
  const sessionId = session.id;

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      if (!sessionId) return;
      // Delayed-notification methods stay "unpaid" until settlement; wait for
      // the async event in that case.
      if (event.type === "checkout.session.completed" && session.payment_status === "unpaid") return;
      await markSessionPaid(sessionId, {
        paymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null),
        email: session.customer_details?.email ?? null,
      });
      return;
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      if (sessionId) await releaseSession(sessionId);
      return;
    }
    default:
      console.log("Unhandled payments event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Payments webhook received invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          await handleEvent(event);
          return Response.json({ received: true });
        } catch (error) {
          console.error("Payments webhook error:", error);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
