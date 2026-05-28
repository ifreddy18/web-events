//////////////////////////////////////////////////////////
// EVENT SERIES
//////////////////////////////////////////////////////////

import type { EventSeriesMetadata } from "@/src/types/metadata/events/event-series-metadata";
import { EventSeriesStatus, Prisma } from "@prisma/client";

export type EventSeriesSeed = {
  organizerSlug: string;
  disciplineSlug: string;

  name: string;
  slug: string;

  description?: string;
  instagram?: string;

  status: EventSeriesStatus;

  metadata?: Prisma.InputJsonValue;
};

//////////////////////////////////////////////////////////
// EVENT SERIES CONSTANTS
//////////////////////////////////////////////////////////

export const EVENT_SERIES: EventSeriesSeed[] = [
  {
    organizerSlug: "gulima-trail-running",
    disciplineSlug: "trail-running",
    name: "Gulima Trail Run",
    slug: "gulima-trail-run",
    description:
      "Trail running event focused on mountain experience, elevation, and outdoor endurance challenges.",
    instagram: "@gulimatrail",
    status: EventSeriesStatus.ACTIVE,
    metadata: {
      terrainTypes: ["mountain", "forest", "technical_trail"],
      beginnerFriendly: false,
      tags: ["trail_running", "mountain", "endurance"],
      audience: ["trail_runners", "ultra_runners"],
      distances: ["12K", "21K", "42K"],
      atmosphere: ["competitive", "adventure"],
    } satisfies EventSeriesMetadata,
  },
  {
    organizerSlug: "maraton-caf",
    disciplineSlug: "road-running",
    name: "Maratón CAF",
    slug: "maraton-caf",
    description:
      "Major Latin American road marathon event attracting runners from multiple countries.",
    instagram: "@maratoncaf",
    status: EventSeriesStatus.ACTIVE,
    metadata: {
      terrainTypes: ["road", "urban"],
      beginnerFriendly: true,
      tags: ["road_running", "marathon"],
      audience: ["road_runners"],
      distances: ["5K", "10K", "21K", "42K"],
      atmosphere: ["competitive", "community"],
    } satisfies EventSeriesMetadata,
  },
  {
    organizerSlug: "triathlon-series-venezuela",
    disciplineSlug: "triathlon",
    name: "Triathlon Series Venezuela",
    slug: "triathlon-series-venezuela",
    description:
      "Triathlon competition series including sprint and olympic formats.",
    instagram: "@triatlonvzla",
    status: EventSeriesStatus.ACTIVE,
    metadata: {
      terrainTypes: ["road", "open_water"],
      beginnerFriendly: false,
      tags: ["triathlon", "multisport"],
      audience: ["triathletes"],
      distances: ["Sprint", "Olympic"],
      atmosphere: ["competitive"],
    } satisfies EventSeriesMetadata,
  },
];
