import { Prisma } from "@prisma/client";
import type { ServiceProviderMetadata } from "../../../src/types/metadata/service-providers/service-provider-metadata";

//////////////////////////////////////////////////////////
// SERVICE PROVIDERS
//////////////////////////////////////////////////////////

export const SERVICE_PROVIDERS: Array<{
  name: string;
  slug: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  city?: string;
  countryCode?: string;
  typeSlugs: string[];
  metadata?: Prisma.InputJsonValue;
}> = [
  //////////////////////////////////////////////////////////
  // SPORTS PHOTOGRAPHER
  //////////////////////////////////////////////////////////

  {
    name: "Andes Sports Media",
    slug: "andes-sports-media",
    description:
      "Sports photography and endurance event coverage across Latin America.",
    instagram: "@andesportsmedia",
    city: "Caracas",
    countryCode: "VE",
    typeSlugs: ["photographer", "content-creator"],
    metadata: {
      specialties: ["trail_running", "triathlon", "cycling"],
      yearsExperience: 6,
      languages: ["es", "en"],
      pricing: {
        currency: "USD",
        startingPrice: 80,
      },
      availability: {
        remote: false,
        inPerson: true,
      },
      tags: ["sports-media", "trail-running"],
    } satisfies ServiceProviderMetadata,
  },

  //////////////////////////////////////////////////////////
  // SPORTS PHYSIO
  //////////////////////////////////////////////////////////

  {
    name: "Recovery Lab",
    slug: "recovery-lab",
    description:
      "Sports recovery and physiotherapy center specialized in runners.",

    instagram: "@recoverylab",
    city: "Bogotá",
    countryCode: "CO",
    typeSlugs: ["physiotherapist"],
    metadata: {
      specialties: ["running_injuries", "mobility", "recovery"],
      yearsExperience: 8,
      availability: {
        inPerson: true,
      },
      tags: ["recovery", "running"],
    } satisfies ServiceProviderMetadata,
  },
];
