import { prisma } from "../utils/prisma";

import { EVENT_EDITION_MEDIA } from "../data/media/event-edition-media.data";

import { logSeed } from "../utils/seed-logger";
import { requireEntity } from "../utils/require-entity";

export async function seedEventEditionMedia() {
  logSeed("Seeding event edition media...");

  for (const item of EVENT_EDITION_MEDIA) {
    //////////////////////////////////////////////////////////
    // Event edition
    //////////////////////////////////////////////////////////

    const eventEdition = requireEntity(
      await prisma.eventEdition.findUnique({
        where: {
          slug: item.eventEditionSlug,
        },
      }),
      `Event edition not found: ${item.eventEditionSlug}`,
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

    await prisma.eventEditionMedia.upsert({
      where: {
        eventEditionId_mediaId: {
          eventEditionId: eventEdition.id,
          mediaId: media.id,
        },
      },

      update: {
        type: item.type,
        caption: item.caption,
        sortOrder: item.sortOrder,
      },

      create: {
        eventEditionId: eventEdition.id,
        mediaId: media.id,

        type: item.type,
        caption: item.caption,
        sortOrder: item.sortOrder,
      },
    });
  }

  console.log("✅ Event edition media seeded.");
}
