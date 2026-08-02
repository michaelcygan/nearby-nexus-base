import { PlaceholderBar } from "@/components/community/section-placeholder";
import type { CommunityWeather } from "@/features/community-today/types";
import { formatTimestamp } from "@/features/neighborhoods/types";

/**
 * One quiet line of weather, plus any active NWS alert. Deliberately not a
 * widget: no icons, no hourly strip, no radar — just what a neighbor glancing
 * at a noticeboard would want to know.
 */
export function WeatherStrip({
  weather,
  timeZone,
  pending,
}: {
  weather: CommunityWeather | null;
  timeZone: string;
  pending?: boolean;
}) {
  // The strip sits above the board, so its space is held while data is in
  // flight — nothing below it may move once the reading arrives.
  if (pending) {
    return (
      <section aria-label="Weather now" aria-busy="true" className="border-b border-border py-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <PlaceholderBar className="h-6 w-14" />
          <PlaceholderBar className="h-4 w-48" />
        </div>
        <PlaceholderBar className="mt-2 h-3 w-40" />
      </section>
    );
  }

  if (!weather) return null;


  const temperature = weather.observedTemperatureF ?? weather.forecastTemperatureF;
  const parts: string[] = [];
  if (weather.shortForecast) parts.push(weather.shortForecast);
  if (weather.highF !== null) parts.push(`High ${weather.highF}°`);
  if (weather.lowF !== null) parts.push(`Low ${weather.lowF}°`);
  if (weather.precipitationChance !== null && weather.precipitationChance >= 20) {
    parts.push(`${weather.precipitationChance}% chance of precipitation`);
  }
  if (weather.wind) parts.push(`Wind ${weather.wind}`);

  const observed = weather.observedTemperatureF !== null;
  const stamp = formatTimestamp(weather.observedAt, timeZone);

  if (temperature === null && parts.length === 0 && weather.alerts.length === 0) return null;

  return (
    <section aria-label="Weather now" className="border-b border-border py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {temperature !== null ? (
          <p className="font-display text-2xl font-semibold leading-none">{temperature}°</p>
        ) : null}
        <p className="min-w-0 text-sm text-muted-foreground">
          {parts.join(" · ")}
          {!observed && temperature !== null ? " · forecast" : ""}
        </p>
      </div>

      {weather.alerts.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {weather.alerts.map((alert) => (
            <li key={alert.id} className="text-sm">
              <a
                href={alert.url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-semibold text-primary underline underline-offset-4"
              >
                {alert.title}
              </a>
              {alert.endsAt ? (
                <span className="text-muted-foreground">
                  {" "}
                  — until {formatTimestamp(alert.endsAt, timeZone)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        <a
          href={weather.attributionUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="underline underline-offset-4"
        >
          National Weather Service
        </a>
        {observed && stamp ? ` · observed ${stamp}` : ""}
      </p>
    </section>
  );
}
