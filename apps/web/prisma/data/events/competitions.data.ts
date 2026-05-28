import { CompetitionStatus } from "@prisma/client";

import type {
  TrailRunningCompetitionMetadata,
  RoadRunningCompetitionMetadata,
  TriathlonCompetitionMetadata,
  HyroxCompetitionMetadata,
} from "@/src/types/metadata/events/competition-metadata";

//////////////////////////////////////////////////////////
// COMPETITIONS
//////////////////////////////////////////////////////////

export const COMPETITIONS = [
  //////////////////////////////////////////////////////////
  // GULIMA TRAIL RUN 2026
  //////////////////////////////////////////////////////////

  {
    eventEditionSlug: "gulima-trail-run-2026",
    disciplineSlug: "trail-running",
    name: "12K Trail",
    slug: "12k-trail",
    status: CompetitionStatus.ACTIVE,
    description: "12K mountain trail race with technical climbs and descents.",
    metadata: {
      distanceKm: 12,
      elevationGainMeters: 650,
      terrainTypes: ["mountain", "forest", "technical"],
      cutoffMinutes: 240,
      aidStations: 2,
      difficulty: "intermediate",
      beginnerFriendly: true,
      tags: ["trail_running", "mountain"],
    } satisfies TrailRunningCompetitionMetadata,
  },

  {
    eventEditionSlug: "gulima-trail-run-2026",
    disciplineSlug: "trail-running",
    name: "21K Trail",
    slug: "21k-trail",
    status: CompetitionStatus.ACTIVE,
    description:
      "Half marathon mountain trail race with technical climbs and descents.",
    metadata: {
      distanceKm: 21,
      elevationGainMeters: 1450,
      terrainTypes: ["mountain", "rocky", "technical"],
      cutoffMinutes: 420,
      aidStations: 4,
      difficulty: "advanced",
      beginnerFriendly: false,
      tags: ["trail_running", "half_marathon"],
    } satisfies TrailRunningCompetitionMetadata,
  },

  //////////////////////////////////////////////////////////
  // MARATON CAF 2026
  //////////////////////////////////////////////////////////

  {
    eventEditionSlug: "maraton-caf-2026",
    disciplineSlug: "road-running",
    name: "21K",
    slug: "21k",
    description: "Half marathon",
    status: CompetitionStatus.ACTIVE,
    metadata: {
      distanceKm: 21.097,
      certifiedCourse: true,
      surfaceType: "asphalt",
      difficulty: "intermediate",
      beginnerFriendly: true,
      tags: ["half_marathon", "road_running"],
    } satisfies RoadRunningCompetitionMetadata,
  },

  {
    eventEditionSlug: "maraton-caf-2026",
    disciplineSlug: "road-running",
    name: "42K",
    slug: "42k",
    description: "Full marathon",
    status: CompetitionStatus.ACTIVE,
    metadata: {
      distanceKm: 42.195,
      certifiedCourse: true,
      surfaceType: "asphalt",
      difficulty: "advanced",
      beginnerFriendly: false,
      tags: ["marathon", "road_running"],
    } satisfies RoadRunningCompetitionMetadata,
  },

  //////////////////////////////////////////////////////////
  // IRONMAN 70.3 MARGARITA 2026
  //////////////////////////////////////////////////////////

  // {
  //   eventEditionSlug: "ironman-70-3-margarita-2026",
  //   disciplineSlug: "triathlon",
  //   name: "Ironman 70.3",
  //   slug: "ironman-70-3",
  //   description:
  //     "Middle-distance triathlon competition with swim, bike, and run segments.",
  //   status: CompetitionStatus.ACTIVE,
  //   metadata: {
  //     swimMeters: 1900,
  //     bikeKm: 90,
  //     runKm: 21.1,
  //     transitions: 2,
  //     draftingAllowed: false,
  //     difficulty: "elite",
  //     beginnerFriendly: false,
  //     tags: ["triathlon", "ironman", "endurance"],
  //   } satisfies TriathlonCompetitionMetadata,
  // },

  //////////////////////////////////////////////////////////
  // HYROX CARACAS 2026
  //////////////////////////////////////////////////////////

  // {
  //   eventEditionSlug: "hyrox-caracas-2026",
  //   disciplineSlug: "hyrox",
  //   name: "HYROX Open",
  //   slug: "hyrox-open",
  //   description: "Hyrox race",
  //   status: CompetitionStatus.ACTIVE,
  //   metadata: {
  //     division: "open",
  //     proWeights: false,
  //     stations: [
  //       "ski_erg",
  //       "sled_push",
  //       "sled_pull",
  //       "burpee_broad_jump",
  //       "rowing",
  //       "farmers_carry",
  //       "sandbag_lunges",
  //       "wall_balls",
  //     ],
  //     difficulty: "advanced",
  //     beginnerFriendly: false,
  //     tags: ["hyrox", "fitness_racing"],
  //   } satisfies HyroxCompetitionMetadata,
  // },
] as const;
