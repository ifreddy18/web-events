///////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////

import { MediaType } from "@prisma/client";

export interface MediaSeed {
  url: string;
  type: MediaType;
  altText?: string;
  width?: number;
  height?: number;
  provider?: string;
}

///////////////////////////////////////////////////////////
// MEDIA
///////////////////////////////////////////////////////////

export const MEDIA: MediaSeed[] = [
  /////////////////////////////////////////////////////////
  // EVENT BANNERS
  /////////////////////////////////////////////////////////

  {
    url: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5",
    type: MediaType.IMAGE,
    altText: "Trail runners climbing a mountain during a race",
    width: 2400,
    height: 1600,
    provider: "unsplash",
  },

  {
    url: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438",
    type: MediaType.IMAGE,
    altText: "Marathon runners crossing the finish line",
    width: 2400,
    height: 1600,
    provider: "unsplash",
  },

  /////////////////////////////////////////////////////////
  // PHOTOGRAPHY PORTFOLIO
  /////////////////////////////////////////////////////////

  {
    url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
    type: MediaType.IMAGE,
    altText: "Trail running athlete portrait during golden hour",
    width: 1800,
    height: 1200,
    provider: "unsplash",
  },

  {
    url: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4",
    type: MediaType.IMAGE,
    altText: "Cyclist racing on mountain roads",
    width: 1800,
    height: 1200,
    provider: "unsplash",
  },

  /////////////////////////////////////////////////////////
  // ATHLETE IMAGES
  /////////////////////////////////////////////////////////

  {
    url: "https://images.unsplash.com/photo-1541534401786-2077eed87a72",
    type: MediaType.IMAGE,
    altText: "Runner training outdoors",
    width: 1600,
    height: 1000,
    provider: "unsplash",
  },
];
