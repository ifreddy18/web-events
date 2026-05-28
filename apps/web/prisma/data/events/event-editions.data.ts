import { EventEditionStatus } from "@prisma/client";

import type { EventEditionMetadata } from "@/src/types/metadata/events/event-edition-metadata";

//////////////////////////////////////////////////////////
// EVENT EDITIONS
//////////////////////////////////////////////////////////

export const EVENT_EDITIONS = [
  //////////////////////////////////////////////////////////
  // GULIMA TRAIL RUN 2026
  //////////////////////////////////////////////////////////

  {
    eventSeriesSlug: "gulima-trail-run",
    locationSlug: "venezuela-caracas-parque-nacional-el-avila",
    year: 2026,
    name: "Gulima Trail Run 2026",
    slug: "gulima-trail-run-2026",
    startsAt: new Date("2026-07-12T06:00:00-04:00"),
    endsAt: new Date("2026-07-12T16:00:00-04:00"),
    registrationUrl: "https://register.gulimatrail.com",
    status: EventEditionStatus.PUBLISHED,
    metadata: {
      sponsors: ["HydrateX", "TrailFuel"],
      hashtags: ["#gulimatrail", "#trailrunning"],
      parkingAvailable: true,
      hydrationStations: true,
      recommendations: ["Bring hydration vest", "Trail shoes required"],
      weatherNotes: "High humidity and warm weather expected.",
      socialLinks: {
        instagram: "https://instagram.com/gulimatrail",
      },
    } satisfies EventEditionMetadata,
  },

  //////////////////////////////////////////////////////////
  // MARATON CAF 2026
  //////////////////////////////////////////////////////////

  {
    eventSeriesSlug: "maraton-caf",
    locationSlug: "venezuela-caracas-altamira",
    year: 2026,
    name: "Maratón CAF 2026",
    slug: "maraton-caf-2026",
    startsAt: new Date("2026-02-15T05:00:00-04:00"),
    endsAt: new Date("2026-02-15T13:00:00-04:00"),
    registrationUrl: "https://www.maratoncaf.com",
    status: EventEditionStatus.PUBLISHED,
    metadata: {
      sponsors: ["CAF", "Gatorade"],
      hashtags: ["#maratoncaf"],
      hydrationStations: true,
      parkingAvailable: false,
    } satisfies EventEditionMetadata,
  },
] as const;
