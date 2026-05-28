import { prisma } from "../utils/prisma";

import { TAGS } from "../data/tags/tags.data";

import { logSeed } from "../utils/seed-logger";

export async function seedTags() {
  logSeed("Seeding tags...");

  for (const tag of TAGS) {
    await prisma.tag.upsert({
      where: {
        slug: tag.slug,
      },

      update: {
        name: tag.name,
        category: tag.category,
      },

      create: {
        name: tag.name,
        slug: tag.slug,
        category: tag.category,
      },
    });
  }

  console.log("✅ Tags seeded.");
}
