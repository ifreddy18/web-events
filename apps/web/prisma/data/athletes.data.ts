import type { Prisma } from "@prisma/client";

import type { AthleteMetadata } from "../../src/types/metadata/athlete-metadata";

//////////////////////////////////////////////////////////
// ATHLETES DATA
//////////////////////////////////////////////////////////

export type AthleteSeed = {
  firstName: string;
  lastName: string;

  fullName: string;

  gender?: string;

  countryCode?: string;

  instagram?: string;

  bio?: string;

  metadata?: Prisma.InputJsonValue;
};

export const ATHLETES: AthleteSeed[] = [
  //////////////////////////////////////////////////////////
  // TRAIL RUNNING
  //////////////////////////////////////////////////////////

  {
    firstName: "Freddy",
    lastName: "González",

    fullName: "Freddy González",

    gender: "male",

    countryCode: "VE",

    instagram: "@freddytrail",

    bio: "Trail runner focused on mountain endurance and long-distance events.",

    metadata: {
      preferredDisciplines: ["trail-running"],

      equipment: {
        watch: "Garmin Fenix 6 Pro",
        shoes: ["Hoka Speedgoat"],
      },

      tags: ["trail-runner", "mountain"],
    } satisfies AthleteMetadata,
  },

  //////////////////////////////////////////////////////////
  // TRIATHLON
  //////////////////////////////////////////////////////////

  {
    firstName: "Carlos",
    lastName: "Rodríguez",

    fullName: "Carlos Rodríguez",

    gender: "male",

    countryCode: "CO",

    instagram: "@carlos_tri",

    bio: "Triathlete specialized in middle-distance endurance races.",

    metadata: {
      preferredDisciplines: ["triathlon"],

      equipment: {
        bike: "Cervélo P-Series",
        watch: "Garmin Forerunner 965",
      },

      tags: ["triathlete", "endurance"],
    } satisfies AthleteMetadata,
  },
];
