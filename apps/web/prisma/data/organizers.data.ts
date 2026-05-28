//////////////////////////////////////////////////////////
// ORGANIZERS
//////////////////////////////////////////////////////////

import type { OrganizerMetadata } from "@/src/types/metadata/organizer-metadata";

//////////////////////////////////////////////////////////
// ORGANIZER CONSTANTS
//////////////////////////////////////////////////////////

export const ORGANIZERS = [
  {
    name: "Gulima Trail Running",
    slug: "gulima-trail-running",
    description: "Trail running organization focused on mountain races and outdoor experiences.",
    instagram: "@gulimatrail",
    metadata: {
      specialties: [
        "trail_running",
        "mountain_running",
      ],
      disciplines: [
        "trail-running",
      ],
      countries: ["VE"],
      organizerType: "community",
    } satisfies OrganizerMetadata,
  },
  {
    name: "Maratón CAF",
    slug: "maraton-caf",
    description: "Major Latin American road running event organizer.",
    instagram: "@maratoncaf",
    metadata: {
      specialties: [
        "road_running",
      ],
      disciplines: [
        "road-running",
      ],
      countries: ["VE"],
      organizerType: "company",
    } satisfies OrganizerMetadata,
  },
  {
    name: "Triathlon Series Venezuela",
    slug: "triathlon-series-venezuela",
    description: "Triathlon event organization and multisport competitions.",
    instagram: "@triatlonvzla",
    metadata: {
      specialties: [
        "triathlon",
      ],
      disciplines: [
        "triathlon",
      ],
      countries: ["VE"],
      organizerType: "company",
    } satisfies OrganizerMetadata,
  },
];