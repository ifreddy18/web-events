import { prisma } from "../utils/prisma";

import { SERVICE_PROVIDERS } from "../data/service-providers/service-providers.data";

import { logSeed } from "../utils/seed-logger";
import { requireEntity } from "../utils/require-entity";

//////////////////////////////////////////////////////////
// SEED SERVICE PROVIDERS
//////////////////////////////////////////////////////////

export async function seedServiceProviders() {
  logSeed("Seeding service providers...");

  for (const provider of SERVICE_PROVIDERS) {
    //////////////////////////////////////////////////////////
    // Upsert provider
    //////////////////////////////////////////////////////////

    const createdProvider = await prisma.serviceProvider.upsert({
      where: {
        slug: provider.slug,
      },

      update: {
        name: provider.name,
        description: provider.description,

        email: provider.email,
        phone: provider.phone,

        website: provider.website,
        instagram: provider.instagram,

        city: provider.city,
        countryCode: provider.countryCode,

        metadata: provider.metadata,
      },

      create: {
        name: provider.name,
        slug: provider.slug,

        description: provider.description,

        email: provider.email,
        phone: provider.phone,

        website: provider.website,
        instagram: provider.instagram,

        city: provider.city,
        countryCode: provider.countryCode,

        metadata: provider.metadata,
      },
    });

    //////////////////////////////////////////////////////////
    // Assign provider types
    //////////////////////////////////////////////////////////

    for (const typeSlug of provider.typeSlugs) {
      const providerType = requireEntity(
        await prisma.serviceProviderType.findUnique({
          where: {
            slug: typeSlug,
          },
        }),
        `Service provider type not found: ${typeSlug}`,
      );

      await prisma.serviceProviderToType.upsert({
        where: {
          providerId_typeId: {
            providerId: createdProvider.id,
            typeId: providerType.id,
          },
        },

        update: {},

        create: {
          providerId: createdProvider.id,
          typeId: providerType.id,
        },
      });
    }
  }

  logSeed("Service providers seeded.");
}
