import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { ErrorState } from "@/components/common/error-state";
import { AppShell, PageContainer } from "@/components/layout/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BlockButton } from "@/components/moderation/block-button";
import { ReportButton } from "@/components/moderation/report-button";
import { neighborProfileQuery, publicProfileQuery } from "@/features/account/queries";
import { initialsFor } from "@/features/account/types";
import { useSession } from "@/hooks/use-session";
import { canonicalUrl } from "@/lib/seo";

export const Route = createFileRoute("/u/$profileId")({
  loader: async ({ params, context }) => {
    const profile = await context.queryClient.ensureQueryData(
      publicProfileQuery(params.profileId),
    );
    if (!profile) throw notFound();
    return { profile };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Neighbor not found" }, { name: "robots", content: "noindex" }],
      };
    }
    const { profile } = loaderData;
    const title = `${profile.display_name} — Neighborhood Today`;
    const description =
      profile.about ??
      `${profile.display_name} is on Neighborhood Today${
        profile.home_neighborhood ? `, around ${profile.home_neighborhood.name}` : ""
      }.`;
    return {
      links: [{ rel: "canonical", href: canonicalUrl(`/u/${params.profileId}`) }],
      meta: [
        { title },
        { property: "og:url", content: canonicalUrl(`/u/${params.profileId}`) },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: NeighborProfilePage,
  errorComponent: () => (
    <AppShell>
      <PageContainer>
        <ErrorState title="This neighbor page didn't load" />
      </PageContainer>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <PageContainer>
        <h1 className="text-3xl">No such neighbor</h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          That profile doesn't exist, or the account was removed.
        </p>
      </PageContainer>
    </AppShell>
  ),
});

function NeighborProfilePage() {
  const { profileId } = Route.useParams();
  const { data: publicProfile } = useSuspenseQuery(publicProfileQuery(profileId));
  const { session } = useSession();
  // Bios and home neighborhoods are sign-in-only, so signed-in visitors get a
  // fuller read of the same neighbor.
  const detailed = useQuery({
    ...neighborProfileQuery(profileId),
    enabled: Boolean(session),
  });

  if (!publicProfile) return null;
  const profile = detailed.data ?? publicProfile;

  return (
    <AppShell>
      <PageContainer>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
            <AvatarFallback>{initialsFor(profile.display_name)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl">{profile.display_name}</h1>
            {profile.home_neighborhood ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Around{" "}
                <Link
                  to="/n/$slug"
                  params={{ slug: profile.home_neighborhood.slug }}
                  className="underline underline-offset-4"
                >
                  {profile.home_neighborhood.name}
                </Link>
                , {profile.home_neighborhood.city}
              </p>
            ) : null}
          </div>
        </div>

        {profile.about ? (
          <>
            <div className="rule-print my-6" />
            <p className="max-w-prose text-base leading-relaxed">{profile.about}</p>
          </>
        ) : !session ? (
          <p className="mt-6 max-w-prose text-sm text-muted-foreground">
            <Link to="/auth" className="underline underline-offset-4">
              Sign in
            </Link>{" "}
            to see what neighbors write about themselves.
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <ReportButton targetType="profile" targetId={profileId} label="Report neighbor" />
          <BlockButton neighborId={profileId} />
        </div>
      </PageContainer>
    </AppShell>
  );
}
