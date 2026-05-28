//////////////////////////////////////////////////////////
// DISCIPLINES SEED DATA
//////////////////////////////////////////////////////////

import type {
  TrailRunningMetadata,
  RoadRunningMetadata,
  UltraRunningMetadata,
  MultisportMetadata,
  CrossfitMetadata,
  HyroxMetadata,
  CyclingMetadata,
} from "@/src/types/metadata/discipline-metadata";

/// =====================================================
/// DISCIPLINES
/// =====================================================
/// Sport-specific competitive disciplines.
///
/// IMPORTANT:
/// Each discipline belongs to a Sport.
///
/// The metadata field is intentionally flexible
/// to support future sport-specific configurations.
///
/// Slugs should NEVER change once in production.
/// =====================================================

export const DISCIPLINES = [
  //////////////////////////////////////////////////////////
  // RUNNING
  //////////////////////////////////////////////////////////

  {
    sportSlug: "running",
    name: "Trail Running",
    slug: "trail-running",
    description:
      "Off-road running competitions usually involving elevation gain and technical terrain.",
    metadata: {
      terrain: ["mountain", "forest", "trail"],
      elevationBased: true,
    } satisfies TrailRunningMetadata,
  },

  {
    sportSlug: "running",
    name: "Road Running",
    slug: "road-running",
    description:
      "Road-based running races including 5K, 10K, half marathon, and marathon events.",
    metadata: {
      terrain: ["road", "urban"],
      elevationBased: false,
    } satisfies RoadRunningMetadata,
  },

  {
    sportSlug: "running",
    name: "Ultra Running",
    slug: "ultra-running",
    description:
      "Long-distance endurance running competitions exceeding marathon distance.",
    metadata: {
      ultraDistance: true,
      enduranceFocused: true,
    } satisfies UltraRunningMetadata,
  },

  //////////////////////////////////////////////////////////
  // MULTISPORT
  //////////////////////////////////////////////////////////

  {
    sportSlug: "multisport",
    name: "Acuathlon",
    slug: "acuathlon",
    description: "Multisport competitions combining swimming and running.",
    metadata: {
      segments: ["swim", "run"],
    } satisfies MultisportMetadata,
  },

  {
    sportSlug: "multisport",
    name: "Duathlon",
    slug: "duathlon",
    description: "Multisport competitions combining cycling and running.",
    metadata: {
      segments: ["bike", "run"],
    } satisfies MultisportMetadata,
  },

  {
    sportSlug: "multisport",
    name: "Triathlon",
    slug: "triathlon",
    description:
      "Multisport competitions combining swimming, cycling, and running.",
    metadata: {
      segments: ["swim", "bike", "run"],
      enduranceFocused: true,
    } satisfies MultisportMetadata,
  },

  //////////////////////////////////////////////////////////
  // FITNESS
  //////////////////////////////////////////////////////////

  {
    sportSlug: "fitness",
    name: "CrossFit",
    slug: "crossfit",
    description:
      "Functional fitness competitions involving strength and conditioning workouts.",
    metadata: {
      workoutBased: true,
      strengthFocused: true,
    } satisfies CrossfitMetadata,
  },

  {
    sportSlug: "fitness",
    name: "Hyrox",
    slug: "hyrox",
    description:
      "Fitness racing competition combining running and functional workout stations.",
    metadata: {
      hybridCompetition: true,
      enduranceFocused: true,
    } satisfies HyroxMetadata,
  },

  //////////////////////////////////////////////////////////
  // CYCLING
  //////////////////////////////////////////////////////////

  {
    sportSlug: "cycling",
    name: "Road Cycling",
    slug: "road-cycling",
    description:
      "Road cycling races including gran fondos and endurance events.",
    metadata: {
      terrain: ["road"],
      enduranceFocused: true,
    } satisfies CyclingMetadata,
  },

  {
    sportSlug: "cycling",
    name: "Mountain Biking",
    slug: "mountain-biking",
    description:
      "Off-road cycling competitions across technical mountain terrain.",
    metadata: {
      terrain: ["mountain", "trail"],
      technical: true,
    } satisfies CyclingMetadata,
  },
];
