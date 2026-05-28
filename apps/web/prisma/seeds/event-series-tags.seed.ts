import { prisma } from "../utils/prisma";

import { EVENT_SERIES_TAGS } from "../data/tags/event-series-tags.data";

import { logSeed } from "../utils/seed-logger";
import { requireEntity } from "../utils/require-entity";

export async function seedEventSeriesTags() {
  logSeed("Seeding event series tags...");

  for (const item of EVENT_SERIES_TAGS) {
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

    await prisma.eventSeriesTag.upsert({
      where: {
        eventSeriesId_tagId: {
          eventSeriesId: eventSeries.id,
          tagId: tag.id,
        },
      },

      update: {},

      create: {
        eventSeriesId: eventSeries.id,
        tagId: tag.id,
      },
    });
  }

  console.log("✅ Event series tags seeded.");
}
