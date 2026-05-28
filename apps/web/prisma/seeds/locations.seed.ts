//////////////////////////////////////////////////////////
// LOCATIONS SEED
//////////////////////////////////////////////////////////

import { prisma } from "../utils/prisma";

import {
  logSeed,
  logSuccess,
} from "../utils/seed-logger";

import { LOCATIONS } from "../data/locations.data";

import { slugify } from "../utils/slugify";

//////////////////////////////////////////////////////////
// SEED LOCATIONS
//////////////////////////////////////////////////////////

export async function seedLocations() {
  logSeed("Seeding locations...");

  for (const location of LOCATIONS) {
    //////////////////////////////////////////////////////
    // Generate unique slug
    //////////////////////////////////////////////////////

    const slug = slugify(
      `${location.country}-${location.city}-${location.venueName}`
    );

    //////////////////////////////////////////////////////
    // Upsert location
    //////////////////////////////////////////////////////

    await prisma.location.upsert({
      where: {
        slug,
      },

      update: {
        country: location.country,
        state: location.state,
        city: location.city,
        venueName: location.venueName,
        latitude: location.latitude,
        longitude: location.longitude,
      },

      create: {
        country: location.country,
        state: location.state,
        city: location.city,
        venueName: location.venueName,
        latitude: location.latitude,
        longitude: location.longitude,
        slug,
      },
    });
  }

  logSuccess("Locations seeded.");
}