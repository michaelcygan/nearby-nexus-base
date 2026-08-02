import { useQuery } from "@tanstack/react-query";

import { AboutCommunity } from "@/components/community/about-community";
import { AroundCommunity } from "@/components/community/around-community";
import { CityPulse } from "@/components/community/city-pulse";
import { ExploreBoard } from "@/components/community/explore-board";
import { NearbyToday, PostGrid, useVisibleLocalPosts } from "@/components/community/board-posts";

import { QuietBoardEmpty } from "@/components/community/quiet-board-empty";
import { SectionHeading } from "@/components/community/section-heading";
import { UsefulPlaces } from "@/components/community/useful-places";
import { WeatherStrip } from "@/components/community/weather-strip";
import { communityTodayQuery } from "@/features/community-today/queries";
import { neighborhoodCountsQuery, neighborhoodPlacesQuery } from "@/features/neighborhoods/queries";
import type { Neighborhood } from "@/features/neighborhoods/types";

/** Today shows a taste of the board; the Plans/Marketplace/Help tabs show all. */
const TODAY_POST_LIMIT = 6;

/**
 * Today is the community's homepage, not a filter. It is composed so the page
 * still reads well when neighbors haven't posted: weather and official city
 * context are ambient, always-there material, while neighbor posts always come
 * first among content. Every non-post section is optional and silently absent
 * on failure.
 */
export function TodayHome({ community }: { community: Neighborhood }) {
  const local = useVisibleLocalPosts(community.slug);
  const shown = local.slice(0, TODAY_POST_LIMIT);

  // Ambient sections are best-effort: never suspend, never error the board.
  const context = useQuery(communityTodayQuery(community.slug));
  const counts = useQuery(neighborhoodCountsQuery(community.slug));
  const places = useQuery(neighborhoodPlacesQuery(community.slug));

  return (
    <div>
      <WeatherStrip weather={context.data?.weather ?? null} timeZone={community.timezone} />

      <div className="space-y-8 pt-6">
        <section>
          <SectionHeading>On the board</SectionHeading>
          {shown.length === 0 ? (
            <div className="mt-3">
              <QuietBoardEmpty slug={community.slug} />
            </div>
          ) : (
            <PostGrid posts={shown} timeZone={community.timezone} />
          )}
        </section>

        {shown.length < TODAY_POST_LIMIT ? (
          <NearbyToday community={community} localVisibleCount={shown.length} />
        ) : null}

        <ExploreBoard slug={community.slug} counts={counts.data} />

        <AroundCommunity
          communityName={community.name}
          items={context.data?.official ?? []}
          timeZone={community.timezone}
        />

        <CityPulse pulse={context.data?.servicePulse ?? null} />

        <UsefulPlaces slug={community.slug} places={places.data ?? []} />

        <AboutCommunity name={community.name} about={community.about} />
      </div>
    </div>
  );
}
