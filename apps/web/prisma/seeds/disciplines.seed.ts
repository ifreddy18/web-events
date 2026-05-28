//////////////////////////////////////////////////////////
// DISCIPLINES SEED
//////////////////////////////////////////////////////////

import { prisma } from "../utils/prisma";

import { DISCIPLINES } from "../data/disciplines.data";

/// =====================================================
/// seedDisciplines
/// =====================================================
/// Seeds all competitive disciplines.
///
/// IMPORTANT:
/// Sports must already exist before running this seed.
/// =====================================================

export async function seedDisciplines() {
  console.log("🌱 Seeding disciplines...");

  for (const discipline of DISCIPLINES) {
    const { sportSlug, ...disciplineData } = discipline;
    //////////////////////////////////////////////////////////
    // Find parent sport
    //////////////////////////////////////////////////////////

    const sport = await prisma.sport.findUnique({
      where: {
        slug: sportSlug,
      },
    });

    //////////////////////////////////////////////////////////
    // Safety validation
    //////////////////////////////////////////////////////////

    if (!sport) {
      throw new Error(`Sport with slug "${sportSlug}" not found.`);
    }

    //////////////////////////////////////////////////////////
    // Upsert discipline
    //////////////////////////////////////////////////////////

    await prisma.discipline.upsert({
      where: {
        slug: discipline.slug,
      },

      update: {
        ...disciplineData,
        sportId: sport.id,
      },

      create: {
        ...disciplineData,
        sportId: sport.id,
      },
    });
  }

  console.log("✅ Disciplines seeded successfully.");
}
