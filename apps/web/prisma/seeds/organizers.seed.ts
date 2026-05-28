//////////////////////////////////////////////////////////
// ORGANIZERS SEED
//////////////////////////////////////////////////////////

import { prisma } from "../utils/prisma";

import {
  logSeed,
  logSuccess,
} from "../utils/seed-logger";

import { ORGANIZERS } from "../data/organizers.data";

//////////////////////////////////////////////////////////
// SEED ORGANIZERS
//////////////////////////////////////////////////////////

export async function seedOrganizers() {
  logSeed("Seeding organizers...");

  for (const organizer of ORGANIZERS) {
    await prisma.organizer.upsert({
      where: {
        slug: organizer.slug,
      },

      update: {
        name: organizer.name,
        description: organizer.description,
        instagram: organizer.instagram,
        metadata: organizer.metadata,
      },

      create: {
        name: organizer.name,
        slug: organizer.slug,
        description: organizer.description,
        instagram: organizer.instagram,
        metadata: organizer.metadata,
      },
    });
  }

  logSuccess("Organizers seeded.");
}