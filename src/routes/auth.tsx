import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageContainer } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { credentialsSchema, emailOnlySchema } from "@/features/account/types";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

const POST_TYPES = ["plan", "marketplace", "volunteer"] as const;
type ComposerAction = (typeof POST_TYPES)[number];

/** Only same-origin paths survive; never an absolute or protocol-relative URL. */
function safePath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value.slice(0, 300);
}

const RETURN_KEY = "nt:auth-return";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: safePath(search["redirect"]),
    action: POST_TYPES.includes(search["action"] as ComposerAction)
      ? (search["action"] as ComposerAction)
      : undefined,
  }),
  head: () => {
    const title = "Sign in — Neighborhood Today";
    const description =
      "Sign in or create a Neighborhood Today account to post a plan, offer something, or ask your neighbors for help.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  // The OAuth round trip leaves this page entirely, so the intended
  // destination and composer action are stashed before the redirect and read
  // back once a session exists.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (search.redirect) {
      window.sessionStorage.setItem(
        RETURN_KEY,
        JSON.stringify({ redirect: search.redirect, action: search.action ?? null }),
      );
    }
  }, [search.redirect, search.action]);

  useEffect(() => {
    let active = true;

    function resumeIntent() {
      let redirect = search.redirect;
      let action: string | null = search.action ?? null;
      if (typeof window !== "undefined") {
        const stored = window.sessionStorage.getItem(RETURN_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as { redirect?: string; action?: string | null };
            redirect = safePath(parsed.redirect) ?? redirect;
            action = parsed.action ?? action;
          } catch {
            // ignore malformed state
          }
          window.sessionStorage.removeItem(RETURN_KEY);
        }
      }

      if (redirect) {
        const slug = redirect.replace(/^\//, "").split("/")[0];
        if (action && slug) {
          navigate({
            to: "/post/new",
            search: { n: slug, type: action as ComposerAction, returnTo: redirect },
            replace: true,
          });
          return;
        }
        navigate({ href: redirect, replace: true });
        return;
      }
      navigate({ to: "/profile", replace: true });
    }

    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) resumeIntent();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        resumeIntent();
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, search.redirect, search.action]);


  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = credentialsSchema.safeParse({ email, password });
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
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setAwaitingConfirm(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        // Public route: the stashed return path is applied after the session lands.
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (result.error) {
        toast.error("Google sign-in didn't complete. Try again.");
      }
    } catch {
      toast.error("Google sign-in didn't complete. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    const parsed = emailOnlySchema.safeParse({ email });
    if (!parsed.success) {
      setErrors({ email: "Enter your email first, then request a reset link." });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Check your email for a password reset link.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send that email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageContainer>
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-3xl">Join your neighborhood</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            An account lets you post plans, list things, offer help and keep your neighborhoods
            close at hand.
          </p>

          {awaitingConfirm ? (
            <div className="mt-8 rounded-md border border-border bg-card p-5">
              <h2 className="font-display text-lg">Confirm your email</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a confirmation link to <strong>{email}</strong>. Click it to finish
                creating your account, then come back here to sign in.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setAwaitingConfirm(false);
                  setMode("signin");
                }}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <Tabs
              value={mode}
              onValueChange={(value) => {
                setMode(value as Mode);
                setErrors({});
              }}
              className="mt-8"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              {(["signin", "signup"] as const).map((value) => (
                <TabsContent key={value} value={value} className="pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={busy}
                    onClick={handleGoogle}
                  >
                    Continue with Google
                  </Button>

                  <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    or use email
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor={`${value}-email`}>Email</Label>
                      <Input
                        id={`${value}-email`}
                        type="email"
                        autoComplete="email"
                        value={email}
                        maxLength={255}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                      {errors["email"] ? (
                        <p className="text-sm text-destructive">{errors["email"]}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${value}-password`}>Password</Label>
                      <Input
                        id={`${value}-password`}
                        type="password"
                        autoComplete={value === "signup" ? "new-password" : "current-password"}
                        value={password}
                        maxLength={72}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                      {errors["password"] ? (
                        <p className="text-sm text-destructive">{errors["password"]}</p>
                      ) : null}
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {value === "signup" ? "Create account" : "Sign in"}
                    </Button>
                  </form>

                  {value === "signin" ? (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={busy}
                      className="mt-4 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    >
                      Forgot your password?
                    </button>
                  ) : null}
                </TabsContent>
              ))}
            </Tabs>
          )}

          <p className="mt-8 text-xs text-muted-foreground">
            By continuing you agree to our{" "}
            <Link to="/terms" className="underline underline-offset-4">
              terms
            </Link>{" "}
            and{" "}
            <Link to="/community-guidelines" className="underline underline-offset-4">
              community guidelines
            </Link>
            .
          </p>
        </div>
      </PageContainer>
    </AppShell>
  );
}
