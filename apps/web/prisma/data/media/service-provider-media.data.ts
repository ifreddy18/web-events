import { MediaUsageType } from "@prisma/client";

export const SERVICE_PROVIDER_MEDIA = [
  //////////////////////////////////////////////////////////
  // ANDRES RODRIGUEZ PHOTOGRAPHY
  //////////////////////////////////////////////////////////

  {
    providerSlug: "andes-sports-media",
    mediaUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",

    type: MediaUsageType.PROFILE,
    caption: "Andres Rodriguez sports photography profile image",
    sortOrder: 1,
  },

  {
    providerSlug: "andes-sports-media",
    mediaUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",

    type: MediaUsageType.PORTFOLIO,
    caption: "Trail runner captured during mountain race",
    sortOrder: 2,
  },

  {
    providerSlug: "andes-sports-media",
    mediaUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",

    type: MediaUsageType.GALLERY,
    caption: "Athletes during technical trail section",
    sortOrder: 3,
  },

  //////////////////////////////////////////////////////////
  // SUMMIT ENDURANCE COACHING
  //////////////////////////////////////////////////////////

  // {
  //   providerSlug: "summit-endurance-coaching",
  //   mediaUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438",
  //   type: MediaUsageType.COVER,
  //   caption: "Summit Endurance Coaching training session",
  //   sortOrder: 1,
  // },

  //////////////////////////////////////////////////////////
  // MOVE LAB PHYSIO
  //////////////////////////////////////////////////////////

  // {
  //   providerSlug: "move-lab-physio",
  //   mediaUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a",
  //   type: MediaUsageType.COVER,
  //   caption: "Sports recovery and physiotherapy session",
  //   sortOrder: 1,
  // },

  //////////////////////////////////////////////////////////
  // CARACAS RUNNERS CLUB
  //////////////////////////////////////////////////////////

  {
    providerSlug: "recovery-lab",
    mediaUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4",
    type: MediaUsageType.BANNER,
    caption: "Caracas Runners Club community long run",
    sortOrder: 1,
  },
];
