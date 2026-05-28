//////////////////////////////////////////////////////////
// EVENT SERIES SEED
//////////////////////////////////////////////////////////

import { prisma } from "../utils/prisma";

import { logSeed, logSuccess } from "../utils/seed-logger";

import { EVENT_SERIES } from "../data/events/event-series.data";

//////////////////////////////////////////////////////////
// SEED EVENT SERIES
//////////////////////////////////////////////////////////

export async function seedEventSeries() {
  logSeed("Seeding event series...");

  for (const eventSeries of EVENT_SERIES) {
    //////////////////////////////////////////////////////////
    // Find organizer
    //////////////////////////////////////////////////////////

    const organizer = await prisma.organizer.findUnique({
      where: {
        slug: eventSeries.organizerSlug,
      },
    });

    if (!organizer) {
      throw new Error(`Organizer not found: ${eventSeries.organizerSlug}`);
    }

    //////////////////////////////////////////////////////////
    // Find discipline
    //////////////////////////////////////////////////////////

    const discipline = await prisma.discipline.findUnique({
      where: {
        slug: eventSeries.disciplineSlug,
      },
    });

    if (!discipline) {
      throw new Error(`Discipline not found: ${eventSeries.disciplineSlug}`);
    }

    //////////////////////////////////////////////////////////
    // Upsert event series
    //////////////////////////////////////////////////////////

    const {
      organizerSlug,
      disciplineSlug,
      ...data
    } = eventSeries;

    await prisma.eventSeries.upsert({
      where: {
        slug: eventSeries.slug,
      },

      update: {
        ...data,
        organizerId: organizer.id,
        disciplineId: discipline.id,
      },

      create: {
        ...data,
        organizerId: organizer.id,
        disciplineId: discipline.id,
      },
    });
  }

  logSuccess("Event series seeded.");
}
