///////////////////////////////////////////////////////////
// IMPORTS
///////////////////////////////////////////////////////////

import { prisma } from "../utils/prisma";

import { EVENT_SERVICE_PROVIDERS } from "../data/service-providers/event-service-providers.data";

import { logSeed } from "../utils/seed-logger";
import { requireEntity } from "../utils/require-entity";

///////////////////////////////////////////////////////////
// SEED EVENT SERVICE PROVIDERS
///////////////////////////////////////////////////////////

export async function seedEventServiceProviders() {
  logSeed("Seeding event service providers...");

  for (const item of EVENT_SERVICE_PROVIDERS) {
    ///////////////////////////////////////////////////////
    // FIND EVENT EDITION
    ///////////////////////////////////////////////////////

    const eventEdition = requireEntity(
      await prisma.eventEdition.findUnique({
        where: {
          slug: item.eventEditionSlug,
        },
      }),
      `Event edition not found: ${item.eventEditionSlug}`,
    );

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
    // UPSERT RELATION
    ///////////////////////////////////////////////////////

    await prisma.eventServiceProvider.upsert({
      where: {
        eventEditionId_providerId_role: {
          eventEditionId: eventEdition.id,
          providerId: provider.id,
          role: item.role,
        },
      },

      update: {
        description: item.description,
        externalUrl: item.externalUrl,
      },

      create: {
        eventEditionId: eventEdition.id,
        providerId: provider.id,

        role: item.role,

        description: item.description,

        externalUrl: item.externalUrl,
      },
    });
  }

  logSeed("Event service providers seeded.");
}
