import { prisma } from "../utils/prisma";
import { logSeed } from "../utils/seed-logger";
import { requireEntity } from "../utils/require-entity";

import { EVENT_EDITIONS } from "../data/events/event-editions.data";

//////////////////////////////////////////////////////////
// SEED EVENT EDITIONS
//////////////////////////////////////////////////////////

export async function seedEventEditions() {
  logSeed("Seeding event editions...");

  for (const edition of EVENT_EDITIONS) {
    //////////////////////////////////////////////////////////
    // FIND EVENT SERIES
    //////////////////////////////////////////////////////////

    const eventSeries = await prisma.eventSeries.findUnique({
      where: {
        slug: edition.eventSeriesSlug,
      },
    });

    if (!eventSeries) {
      throw new Error(`Event series not found: ${edition.eventSeriesSlug}`);
    }

    //////////////////////////////////////////////////////////
    // FIND LOCATION
    //////////////////////////////////////////////////////////

    const location = requireEntity(
      await prisma.location.findUnique({
        where: {
          slug: edition.locationSlug,
        },
      }),
      `Location not found: ${edition.locationSlug}`
    );

    //////////////////////////////////////////////////////////
    // UPSERT EVENT EDITION
    //////////////////////////////////////////////////////////

    await prisma.eventEdition.upsert({
      where: {
        slug: edition.slug,
      },

      update: {
        name: edition.name,
        year: edition.year,
        startsAt: edition.startsAt,
        endsAt: edition.endsAt,
        registrationUrl: edition.registrationUrl,
        status: edition.status,
        metadata: edition.metadata,
        eventSeriesId: eventSeries.id,
        locationId: location.id,
      },

      create: {
        name: edition.name,
        slug: edition.slug,
        year: edition.year,
        startsAt: edition.startsAt,
        endsAt: edition.endsAt,
        registrationUrl: edition.registrationUrl,
        status: edition.status,
        metadata: edition.metadata,
        eventSeriesId: eventSeries.id,
        locationId: location.id,
      },
    });
  }

  logSeed("Event editions seeded successfully.");
}
