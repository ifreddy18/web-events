///////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////

import { ServiceProviderRole } from "@prisma/client";

export interface EventServiceProviderSeed {
  eventEditionSlug: string;
  providerSlug: string;
  role: ServiceProviderRole;
  description?: string;
  externalUrl?: string;
}

///////////////////////////////////////////////////////////
// EVENT SERVICE PROVIDERS
///////////////////////////////////////////////////////////

export const EVENT_SERVICE_PROVIDERS: EventServiceProviderSeed[] = [
  /////////////////////////////////////////////////////////
  // GULIMA 2025
  /////////////////////////////////////////////////////////

  {
    eventEditionSlug: "gulima-trail-run-2026",
    providerSlug: "andes-sports-media",
    role: ServiceProviderRole.OFFICIAL_PHOTOGRAPHER,
    description:
      "Official race photographer covering all distances and finish line moments.",
    externalUrl: "https://instagram.com/juanperez.photo",
  },

  {
    eventEditionSlug: "gulima-trail-run-2026",
    providerSlug: "recovery-lab",
    role: ServiceProviderRole.RECOVERY_PARTNER,
    description:
      "Recovery and physiotherapy support for athletes after the race.",
  },

  /////////////////////////////////////////////////////////
  // CARACAS MARATHON 2025
  /////////////////////////////////////////////////////////

  // {
  //   eventEditionSlug: "caracas-marathon-2025",
  //   providerSlug: "andes-sports-media",
  //   role: ServiceProviderRole.COACH_GUEST,
  //   description: "Community running club supporting athletes during the event.",
  // },

  {
    eventEditionSlug: "maraton-caf-2026",
    providerSlug: "andes-sports-media",
    role: ServiceProviderRole.UNOFFICIAL_PHOTOGRAPHER,
    description: "Official endurance coaching and race strategy partner.",
  },
];
