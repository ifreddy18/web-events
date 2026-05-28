import { prisma } from "../utils/prisma";

import { EVENT_RESOURCES } from "../data/events/event-resources.data";

import { logSeed } from "../utils/seed-logger";

export async function seedEventResources() {
  logSeed("Seeding event resources...");

  for (const resource of EVENT_RESOURCES) {
    ///////////////////////////////////////////////////////
    // EVENT EDITION
    ///////////////////////////////////////////////////////

    const eventEdition = await prisma.eventEdition.findUnique({
      where: {
        slug: resource.eventEditionSlug,
      },
    });

    if (!eventEdition) {
      throw new Error(
        `Event edition not found: ${resource.eventEditionSlug}`
      );
    }

    ///////////////////////////////////////////////////////
    // SERVICE PROVIDER (OPTIONAL)
    ///////////////////////////////////////////////////////

    let serviceProviderId: string | undefined = undefined;

    if (resource.serviceProviderSlug) {
      const serviceProvider =
        await prisma.serviceProvider.findUnique({
          where: {
            slug: resource.serviceProviderSlug,
          },
        });

      if (!serviceProvider) {
        throw new Error(
          `Service provider not found: ${resource.serviceProviderSlug}`
        );
      }

      serviceProviderId = serviceProvider.id;
    }

    await prisma.eventResource.upsert({
      where: {
        slug: resource.slug,
      },

      update: {
        title: resource.title,
        type: resource.type,
        provider: resource.provider,
        url: resource.url,
        section: resource.section,
        description: resource.description,
        submittedByName: resource.submittedByName,
        submittedByInstagram: resource.submittedByInstagram,
        isVerified: resource.isVerified,
        eventEditionId: eventEdition.id,
        serviceProviderId,
      },

      create: {
        title: resource.title,
        slug: resource.slug,
        type: resource.type,
        provider: resource.provider,
        url: resource.url,
        section: resource.section,
        description: resource.description,
        submittedByName: resource.submittedByName,
        submittedByInstagram: resource.submittedByInstagram,
        isVerified: resource.isVerified,
        eventEditionId: eventEdition.id,
        serviceProviderId,
      },
    });
  }

  console.log("✅ Event resources seeded.");
}