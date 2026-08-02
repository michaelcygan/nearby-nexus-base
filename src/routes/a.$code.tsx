import { createFileRoute } from "@tanstack/react-router";

/**
 * NFC / QR entry point. Records an anonymous aggregate scan, then sends the
 * visitor straight to the community board with a temporary redirect.
 */
export const Route = createFileRoute("/a/$code")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { recordScanAndResolveDestination } = await import(
          "@/features/access-points/scan.server"
        );
        const destination = await recordScanAndResolveDestination(params.code);
        return new Response(null, {
          status: 302,
          headers: { Location: destination ?? "/", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
