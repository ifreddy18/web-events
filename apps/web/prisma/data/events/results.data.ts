import { ResultStatus, type Prisma } from "@prisma/client";

import type { ResultMetadata } from "../../../src/types/metadata/events/results-metadata";

//////////////////////////////////////////////////////////
// RESULTS DATA
//////////////////////////////////////////////////////////

export type ResultSeed = {
  competitionSlug: string;
  athleteFullName: string;
  bibNumber?: string;
  officialTimeSeconds?: number;
  chipTimeSeconds?: number;
  overallRank?: number;
  genderRank?: number;
  categoryRank?: number;
  status: ResultStatus;
  metadata?: Prisma.InputJsonValue;
};

export const RESULTS: ResultSeed[] = [
  //////////////////////////////////////////////////////////
  // GULIMA 21K
  //////////////////////////////////////////////////////////

  {
    competitionSlug: "21k-trail",
    athleteFullName: "Freddy González",
    bibNumber: "245",
    officialTimeSeconds: 9234,
    chipTimeSeconds: 9201,
    overallRank: 15,
    genderRank: 12,
    categoryRank: 4,
    status: ResultStatus.FINISHED,
    metadata: {
      paceSecondsPerKm: 438,
      averageHeartRate: 168,
      maxHeartRate: 188,
      elevationGainMeters: 1450,
      tags: ["trail", "mountain"],
    } satisfies ResultMetadata,
  },

  //////////////////////////////////////////////////////////
  // IRONMAN 70.3
  //////////////////////////////////////////////////////////

  // {
  //   competitionSlug: "ironman-70-3",
  //   athleteFullName: "Carlos Rodríguez",
  //   bibNumber: "118",
  //   officialTimeSeconds: 19840,
  //   chipTimeSeconds: 19790,
  //   overallRank: 42,
  //   genderRank: 37,
  //   categoryRank: 11,
  //   status: ResultStatus.FINISHED,
  //   metadata: {
  //     averageHeartRate: 158,
  //     maxHeartRate: 181,
  //     segments: {
  //       swimSeconds: 2300,
  //       bikeSeconds: 11200,
  //       runSeconds: 5900,
  //       transition1Seconds: 210,
  //       transition2Seconds: 180,
  //     },

  //     tags: ["triathlon", "endurance"],
  //   } satisfies ResultMetadata,
  // },
];
