import { prisma } from "../utils/prisma";
import { ATHLETES } from "../data/athletes.data";
import { logSeed } from "../utils/seed-logger";

//////////////////////////////////////////////////////////
// SEED ATHLETES
//////////////////////////////////////////////////////////

export async function seedAthletes() {
  logSeed("Seeding athletes...");

  for (const athlete of ATHLETES) {
    await prisma.athlete.upsert({
      where: {
        fullName: athlete.fullName,
      },

      update: {
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        gender: athlete.gender,
        countryCode: athlete.countryCode,
        instagram: athlete.instagram,
        bio: athlete.bio,
        metadata: athlete.metadata,
      },

      create: {
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        fullName: athlete.fullName,
        gender: athlete.gender,
        countryCode: athlete.countryCode,
        instagram: athlete.instagram,
        bio: athlete.bio,
        metadata: athlete.metadata,
      },
    });
  }

  logSeed("Athletes seeded.");
}
