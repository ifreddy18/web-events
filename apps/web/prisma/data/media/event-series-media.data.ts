import { MediaUsageType } from "@prisma/client";

export const EVENT_SERIES_MEDIA = [
  //////////////////////////////////////////////////////////
  // GULIMA TRAIL RUN
  //////////////////////////////////////////////////////////

  {
    eventSeriesSlug: "gulima-trail-run",
    mediaUrl: "https://images.unsplash.com/photo-1541534401786-2077eed87a72",
    type: MediaUsageType.BANNER,
    caption: "Gulima Trail Run mountain experience banner",
    sortOrder: 1,
  },

  {
    eventSeriesSlug: "gulima-trail-run",
    mediaUrl: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5",
    type: "COVER",
    caption: "Trail runners during Gulima Trail Run",
    sortOrder: 2,
  },

  //////////////////////////////////////////////////////////
  // CARACAS CITY MARATHON
  //////////////////////////////////////////////////////////

  {
    eventSeriesSlug: "maraton-caf",
    mediaUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
    type: MediaUsageType.BANNER,
    caption: "Caracas City Marathon official banner",
    sortOrder: 1,
  },

  {
    eventSeriesSlug: "maraton-caf",
    mediaUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4",
    type: MediaUsageType.COVER,
    caption: "Road runners during marathon event",
    sortOrder: 2,
  },
];
