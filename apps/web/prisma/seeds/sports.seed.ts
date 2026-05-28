//////////////////////////////////////////////////////////
// SPORTS SEED
//////////////////////////////////////////////////////////

import { prisma } from "../utils/prisma";
import { SPORTS } from "../data/sports.data";

/// =====================================================
/// seedSports
/// =====================================================
/// Seeds foundational sports data.
///
/// IMPORTANT:
/// Uses upsert to ensure idempotency.
///
/// This seed can safely run multiple times
/// without creating duplicated records.
/// =====================================================

export async function seedSports() {
  console.log("🌱 Seeding sports...");

  for (const sport of SPORTS) {
    await prisma.sport.upsert({
      where: {
        slug: sport.slug,
      },

      update: {
        name: sport.name,
        description: sport.description,
      },

      create: {
        ...sport,
      },
    });
  }

  console.log("✅ Sports seeded successfully.");
}
