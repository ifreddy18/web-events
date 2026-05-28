//////////////////////////////////////////////////////////
// SERVICE PROVIDER TYPES SEED
//////////////////////////////////////////////////////////

import { prisma } from "../utils/prisma";
import { logSeed, logSuccess } from "../utils/seed-logger";

import { SERVICE_PROVIDER_TYPES } from "../data/service-providers/service-provider-types.data";

//////////////////////////////////////////////////////////
// SEED SERVICE PROVIDER TYPES
//////////////////////////////////////////////////////////

export async function seedServiceProviderTypes() {
  logSeed("Seeding service provider types...");

  for (const providerType of SERVICE_PROVIDER_TYPES) {
    await prisma.serviceProviderType.upsert({
      where: {
        slug: providerType.slug,
      },

      update: {
        name: providerType.name,
        description: providerType.description,
      },

      create: {
        name: providerType.name,
        slug: providerType.slug,
        description: providerType.description,
      },
    });
  }

  logSuccess("Service provider types seeded.");
}
