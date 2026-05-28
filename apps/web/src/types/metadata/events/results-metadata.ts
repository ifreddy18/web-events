//////////////////////////////////////////////////////////
// RESULT METADATA
//////////////////////////////////////////////////////////

export interface ResultMetadata {
  paceSecondsPerKm?: number;

  averageHeartRate?: number;

  maxHeartRate?: number;

  elevationGainMeters?: number;

  calories?: number;

  splits?: Array<{
    distanceKm: number;
    timeSeconds: number;
  }>;

  segments?: {
    swimSeconds?: number;
    bikeSeconds?: number;
    runSeconds?: number;

    transition1Seconds?: number;
    transition2Seconds?: number;
  };

  tags?: string[];
}
