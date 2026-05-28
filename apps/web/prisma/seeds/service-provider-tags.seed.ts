import { prisma } from "../utils/prisma";

import { SERVICE_PROVIDER_TAGS } from "../data/tags/service-providers-tags.data";

import { logSeed } from "../utils/seed-logger";
import { requireEntity } from "../utils/require-entity";

export async function seedServiceProviderTags() {
  logSeed("Seeding service provider tags...");

  for (const item of SERVICE_PROVIDER_TAGS) {
    //////////////////////////////////////////////////////////
    // Provider
    //////////////////////////////////////////////////////////

    const provider = requireEntity(
      await prisma.serviceProvider.findUnique({
        where: {
          slug: item.providerSlug,
        },
      }),
      `Service provider not found: ${item.providerSlug}`,
    );

    //////////////////////////////////////////////////////////
    // Tag
    //////////////////////////////////////////////////////////

    const tag = requireEntity(
      await prisma.tag.findUnique({
        where: {
          slug: item.tagSlug,
        },
      }),
      `Tag not found: ${item.tagSlug}`,
    );

    //////////////////////////////////////////////////////////
    // Upsert relation
    //////////////////////////////////////////////////////////

    await prisma.serviceProviderTag.upsert({
      where: {
        providerId_tagId: {
          providerId: provider.id,
          tagId: tag.id,
        },
      },

      update: {},

      create: {
        providerId: provider.id,
        tagId: tag.id,
      },
    });
  }

  console.log("✅ Service provider tags seeded.");
}
