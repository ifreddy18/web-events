import { prisma } from "../utils/prisma";

import { EVENT_SERIES_MEDIA } from "../data/media/event-series-media.data";

import { logSeed } from "../utils/seed-logger";
import { requireEntity } from "../utils/require-entity";

export async function seedEventSeriesMedia() {
  logSeed("Seeding event series media...");

  for (const item of EVENT_SERIES_MEDIA) {
    //////////////////////////////////////////////////////////
    // Event series
    //////////////////////////////////////////////////////////

    const eventSeries = requireEntity(
      await prisma.eventSeries.findUnique({
        where: {
          slug: item.eventSeriesSlug,
        },
      }),
      `Event series not found: ${item.eventSeriesSlug}`,
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

    await prisma.eventSeriesMedia.upsert({
      where: {
        eventSeriesId_mediaId: {
          eventSeriesId: eventSeries.id,
          mediaId: media.id,
        },
      },

      update: {
        type: item.type,
        caption: item.caption,
        sortOrder: item.sortOrder,
      },

      create: {
        eventSeriesId: eventSeries.id,
        mediaId: media.id,

        type: item.type,
        caption: item.caption,
        sortOrder: item.sortOrder,
      },
    });
  }

  console.log("✅ Event series media seeded.");
}
