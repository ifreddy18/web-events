///////////////////////////////////////////////////////////
// IMPORTS
///////////////////////////////////////////////////////////

import { prisma } from "../utils/prisma";

import { SERVICE_PROVIDER_DISCIPLINES } from "../data/service-providers/service-provider-disciplines.data";

import { logSeed } from "../utils/seed-logger";
import { requireEntity } from "../utils/require-entity";

///////////////////////////////////////////////////////////
// SEED SERVICE PROVIDER DISCIPLINES
///////////////////////////////////////////////////////////

export async function seedServiceProviderDisciplines() {
  logSeed("Seeding service provider disciplines...");

  for (const item of SERVICE_PROVIDER_DISCIPLINES) {
    ///////////////////////////////////////////////////////
    // FIND PROVIDER
    ///////////////////////////////////////////////////////

    const provider = requireEntity(
      await prisma.serviceProvider.findUnique({
        where: {
          slug: item.providerSlug,
        },
      }),
      `Service provider not found: ${item.providerSlug}`,
    );

    ///////////////////////////////////////////////////////
    // FIND DISCIPLINE
    ///////////////////////////////////////////////////////

    const discipline = requireEntity(
      await prisma.discipline.findUnique({
        where: {
          slug: item.disciplineSlug,
        },
      }),
      `Discipline not found: ${item.disciplineSlug}`,
    );

    ///////////////////////////////////////////////////////
    // UPSERT RELATION
    ///////////////////////////////////////////////////////

    await prisma.serviceProviderDiscipline.upsert({
      where: {
        providerId_disciplineId: {
          providerId: provider.id,
          disciplineId: discipline.id,
        },
      },

      update: {},

      create: {
        providerId: provider.id,
        disciplineId: discipline.id,
      },
    });
  }

  logSeed("Service provider disciplines seeded.");
}
