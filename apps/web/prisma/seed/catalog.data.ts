// Initial Sport/Discipline catalog. Data only; execution lives in catalog.ts.
// Slugs are permanent (URLs, filters, metadata schemas key off discipline slugs).
// Distances (5K, 10K, 21K, 42K...) are NOT disciplines: they belong on Competition.
// Sport-specific attributes live in Competition.metadata, so no Discipline.metadata here.

export type CatalogDiscipline = { name: string; slug: string; description: string }
export type CatalogSport = {
  name: string
  slug: string
  description: string
  disciplines: CatalogDiscipline[]
}

export const CATALOG: CatalogSport[] = [
  {
    name: "Running",
    slug: "running",
    description: "Running events including road races, trail races, and endurance competitions.",
    disciplines: [
      {
        name: "Road Running",
        slug: "road-running",
        description: "Road-based running races of any distance, from 5K to the marathon.",
      },
      {
        name: "Trail Running",
        slug: "trail-running",
        description: "Off-road running competitions usually involving elevation gain and technical terrain.",
      },
      {
        name: "Ultra Running",
        slug: "ultra-running",
        description: "Long-distance endurance running competitions exceeding marathon distance.",
      },
    ],
  },
  {
    name: "Multisport",
    slug: "multisport",
    description: "Multisport competitions combining swimming, cycling, and/or running.",
    disciplines: [
      {
        name: "Triathlon",
        slug: "triathlon",
        description: "Multisport competitions combining swimming, cycling, and running.",
      },
      {
        name: "Duathlon",
        slug: "duathlon",
        description: "Multisport competitions combining running and cycling.",
      },
      {
        name: "Aquathlon",
        slug: "aquathlon",
        description: "Multisport competitions combining swimming and running.",
      },
    ],
  },
  {
    name: "Cycling",
    slug: "cycling",
    description: "Cycling competitions including road, MTB, and endurance events.",
    disciplines: [
      {
        name: "Road Cycling",
        slug: "road-cycling",
        description: "Road cycling races including gran fondos and endurance events.",
      },
      {
        name: "Mountain Biking",
        slug: "mountain-biking",
        description: "Off-road cycling competitions across technical mountain terrain.",
      },
    ],
  },
  {
    name: "Swimming",
    slug: "swimming",
    description: "Swimming competitions in pools and open water.",
    disciplines: [
      {
        name: "Pool Swimming",
        slug: "pool-swimming",
        description: "Swimming competitions held in a pool.",
      },
      {
        name: "Open Water Swimming",
        slug: "open-water-swimming",
        description: "Swimming competitions in the sea, lakes, or rivers.",
      },
    ],
  },
  {
    name: "Obstacle Course Racing",
    slug: "obstacle-course-racing",
    description: "Races combining running with man-made or natural obstacles.",
    disciplines: [
      {
        name: "Obstacle Course Racing (OCR)",
        slug: "obstacle-course-racing",
        description: "Obstacle course races of any distance, including Spartan-style events.",
      },
    ],
  },
  {
    name: "Fitness",
    slug: "fitness",
    description: "Functional fitness competitions including CrossFit-style events and Hyrox.",
    disciplines: [
      {
        name: "CrossFit",
        slug: "crossfit",
        description: "Functional fitness competitions involving strength and conditioning workouts.",
      },
      {
        name: "Hyrox",
        slug: "hyrox",
        description: "Fitness racing combining running and functional workout stations.",
      },
    ],
  },
]
