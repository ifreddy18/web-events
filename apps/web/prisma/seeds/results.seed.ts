import { prisma } from "../utils/prisma";

import { RESULTS } from "../data/events/results.data";

import { logSeed } from "../utils/seed-logger";
import { requireEntity } from "../utils/require-entity";

//////////////////////////////////////////////////////////
// SEED RESULTS
//////////////////////////////////////////////////////////

export async function seedResults() {
  logSeed("Seeding results...");

  for (const result of RESULTS) {
    //////////////////////////////////////////////////////////
    // Find competition
    //////////////////////////////////////////////////////////

    const competition = requireEntity(
      await prisma.competition.findFirst({
        where: {
          slug: result.competitionSlug,
        },
      }),
      `Competition not found: ${result.competitionSlug}`,
    );

    //////////////////////////////////////////////////////////
    // Find athlete
    //////////////////////////////////////////////////////////

    const athlete = requireEntity(
      await prisma.athlete.findFirst({
        where: {
          fullName: result.athleteFullName,
        },
      }),
      `Athlete not found: ${result.athleteFullName}`,
    );

    //////////////////////////////////////////////////////////
    // Upsert result
    //////////////////////////////////////////////////////////

    await prisma.result.upsert({
      where: {
        competitionId_athleteId: {
          competitionId: competition.id,
          athleteId: athlete.id,
        },
      },

      update: {
        bibNumber: result.bibNumber,

        officialTimeSeconds: result.officialTimeSeconds,
        chipTimeSeconds: result.chipTimeSeconds,

        overallRank: result.overallRank,
        genderRank: result.genderRank,
        categoryRank: result.categoryRank,

        status: result.status,

        metadata: result.metadata,
      },

      create: {
        competitionId: competition.id,
        athleteId: athlete.id,

        bibNumber: result.bibNumber,

        officialTimeSeconds: result.officialTimeSeconds,
        chipTimeSeconds: result.chipTimeSeconds,

        overallRank: result.overallRank,
        genderRank: result.genderRank,
        categoryRank: result.categoryRank,

        status: result.status,

        metadata: result.metadata,
      },
    });
  }

  logSeed("Results seeded.");
}
