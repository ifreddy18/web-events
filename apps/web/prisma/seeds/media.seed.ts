///////////////////////////////////////////////////////////
// IMPORTS
///////////////////////////////////////////////////////////

import { prisma } from "../utils/prisma";

import { MEDIA } from "../data/media/media.data";

import { logSeed } from "../utils/seed-logger";

///////////////////////////////////////////////////////////
// SEED MEDIA
///////////////////////////////////////////////////////////

export async function seedMedia() {
  logSeed("Seeding media...");

  for (const media of MEDIA) {
    ///////////////////////////////////////////////////////
    // UPSERT MEDIA
    ///////////////////////////////////////////////////////

    await prisma.media.upsert({
      where: {
        url: media.url,
      },

      update: {
        type: media.type,
        altText: media.altText,
        width: media.width,
        height: media.height,
        provider: media.provider,
      },

      create: {
        url: media.url,
        type: media.type,
        altText: media.altText,
        width: media.width,
        height: media.height,
        provider: media.provider,
      },
    });
  }

  logSeed("Media seeded.");
}
