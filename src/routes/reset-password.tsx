import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageContainer } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { newPasswordSchema } from "@/features/account/types";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => {
    const title = "Set a new password — Neighborhood Today";
    const description = "Choose a new password for your Neighborhood Today account.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase turns the recovery link into a session, then fires PASSWORD_RECOVERY.
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) setReady(true);

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = newPasswordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
      if (error) throw error;
      toast.success("Password updated.");
      navigate({ to: "/profile", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageContainer>
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-3xl">Set a new password</h1>
          {ready ? (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  maxLength={72}
                  onChange={(event) => setPassword(event.target.value)}
                />
                {errors["password"] ? (
                  <p className="text-sm text-destructive">{errors["password"]}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  maxLength={72}
                  onChange={(event) => setConfirm(event.target.value)}
                />
                {errors["confirm"] ? (
                  <p className="text-sm text-destructive">{errors["confirm"]}</p>
                ) : null}
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                Update password
              </Button>
            </form>
          ) : (
            <p className="mt-6 max-w-prose text-sm text-muted-foreground">
              Open this page from the reset link in your email. If the link has expired, request a
              new one from the sign-in page.
            </p>
          )}
        </div>
      </PageContainer>
    </AppShell>
  );
}
