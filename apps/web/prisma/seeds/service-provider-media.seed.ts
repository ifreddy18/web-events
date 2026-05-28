import { prisma } from "../utils/prisma";

import { SERVICE_PROVIDER_MEDIA } from "../data/media/service-provider-media.data";

import { logSeed } from "../utils/seed-logger";
import { requireEntity } from "../utils/require-entity";

export async function seedServiceProviderMedia() {
  logSeed("Seeding service provider media...");

  for (const item of SERVICE_PROVIDER_MEDIA) {
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
    // Media
    //////////////////////////////////////////////////////////

    const media = requireEntity(
      await prisma.media.findFirst({
        where: {
          url: item.mediaUrl,
        },
      }),
      `Media not found: ${item.mediaUrl}`,
    );

    //////////////////////////////////////////////////////////
    // Upsert relation
    //////////////////////////////////////////////////////////

    await prisma.serviceProviderMedia.upsert({
      where: {
        providerId_mediaId: {
          providerId: provider.id,
          mediaId: media.id,
        },
      },

      update: {
        type: item.type,
        caption: item.caption,
        sortOrder: item.sortOrder,
      },

      create: {
        providerId: provider.id,
        mediaId: media.id,

        type: item.type,
        caption: item.caption,
        sortOrder: item.sortOrder,
      },
    });
  }

  console.log("✅ Service provider media seeded.");
}
