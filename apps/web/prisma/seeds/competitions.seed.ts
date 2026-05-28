import { prisma } from "../utils/prisma";

import { COMPETITIONS } from "../data/events/competitions.data";

import { logSeed } from "../utils/seed-logger";
import { requireEntity } from "../utils/require-entity";

//////////////////////////////////////////////////////////
// SEED COMPETITIONS
//////////////////////////////////////////////////////////

export async function seedCompetitions() {
  logSeed("Seeding competitions...");

  for (const competition of COMPETITIONS) {
    //////////////////////////////////////////////////////////
    // Find event edition
    //////////////////////////////////////////////////////////

    const eventEdition = requireEntity(
      await prisma.eventEdition.findUnique({
        where: {
          slug: competition.eventEditionSlug,
        },
      }),
      `Event edition not found: ${competition.eventEditionSlug}`,
    );

    //////////////////////////////////////////////////////////
    // Find discipline
    //////////////////////////////////////////////////////////

    const discipline = requireEntity(
      await prisma.discipline.findUnique({
        where: {
          slug: competition.disciplineSlug,
        },
      }),
      `Discipline not found: ${competition.disciplineSlug}`,
    );

    //////////////////////////////////////////////////////////
    // Upsert competition
    //////////////////////////////////////////////////////////

    await prisma.competition.upsert({
      where: {
        eventEditionId_slug: {
          eventEditionId: eventEdition.id,
          slug: competition.slug,
        },
      },

      update: {
        name: competition.name,
        description: competition.description,
        status: competition.status,
        metadata: competition.metadata,

        disciplineId: discipline.id,
      },

      create: {
        eventEditionId: eventEdition.id,

        disciplineId: discipline.id,

        name: competition.name,
        slug: competition.slug,

        description: competition.description,

        status: competition.status,

        metadata: competition.metadata,
      },
    });
  }

  logSeed("Competitions seeded.");
}
