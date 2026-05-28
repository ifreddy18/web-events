import {
  EventResourceType,
  ResourceProvider,
} from "@prisma/client";

export const EVENT_RESOURCES = [
  {
    eventEditionSlug: "gulima-trail-run-2026",

    serviceProviderSlug: "andes-sports-media",

    title: "Finish Line Gallery",
    slug: "gulima-trail-run-2025-finish-line-gallery",

    type: EventResourceType.PHOTO_GALLERY,

    provider: ResourceProvider.GOOGLE_DRIVE,

    url: "https://drive.google.com/example-finish-line",

    section: "Finish Line",

    description:
      "Official finish line gallery for Gulima Trail Run 2025.",

    submittedByName: "Andes Trail Media",

    submittedByInstagram: "@andestrailmedia",

    isVerified: true,
  },

  {
    eventEditionSlug: "gulima-trail-run-2026",

    title: "Official Aftermovie",
    slug: "gulima-trail-run-2025-official-aftermovie",

    type: EventResourceType.VIDEO,

    provider: ResourceProvider.YOUTUBE,

    url: "https://youtube.com/example-aftermovie",

    description:
      "Official event aftermovie featuring highlights and drone footage.",

    isVerified: true,
  },
];