//////////////////////////////////////////////////////////
// SPORTS SEED DATA
//////////////////////////////////////////////////////////

/// =====================================================
/// SPORTS
/// =====================================================
/// High-level sports categories.
///
/// IMPORTANT:
/// These are permanent foundational entities.
///
/// Slugs should NEVER change once in production,
/// because they may be used for:
/// - SEO
/// - frontend routing
/// - API filtering
/// - search indexing
/// =====================================================

export const SPORTS = [
  {
    name: "Running",
    slug: "running",
    description:
      "Running events including road races, trail races, and endurance competitions.",
  },

  {
    name: "Multisport",
    slug: "multisport",
    description:
      "Multisport competitions combining swimming, cycling, and/or running.",
  },

  {
    name: "Fitness",
    slug: "fitness",
    description:
      "Functional fitness competitions including CrossFit and Hyrox.",
  },

  {
    name: "Cycling",
    slug: "cycling",
    description:
      "Cycling competitions including road, MTB, and endurance events.",
  },
];
