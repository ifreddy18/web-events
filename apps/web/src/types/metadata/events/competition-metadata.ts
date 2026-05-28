/// =====================================================
/// BASE COMPETITION METADATA
/// =====================================================
/// Shared fields used by all competition types.
/// =====================================================

export interface BaseCompetitionMetadata {
  /**
   * Public tags used for search/filtering.
   */
  tags?: string[];

  /**
   * Competition difficulty level.
   *
   * Examples:
   * - beginner
   * - intermediate
   * - advanced
   * - elite
   */
  difficulty?: string;

  /**
   * Whether the competition is beginner friendly.
   */
  beginnerFriendly?: boolean;
}

/// =====================================================
/// TRAIL RUNNING COMPETITION METADATA
/// =====================================================

export interface TrailRunningCompetitionMetadata
  extends BaseCompetitionMetadata {
  /**
   * Distance in kilometers.
   */
  distanceKm: number;

  /**
   * Positive elevation gain in meters.
   */
  elevationGainMeters?: number;

  /**
   * Terrain types.
   *
   * Examples:
   * - mountain
   * - forest
   * - rocky
   * - mud
   */
  terrainTypes?: string[];

  /**
   * Cutoff time in minutes.
   */
  cutoffMinutes?: number;

  /**
   * Aid station count.
   */
  aidStations?: number;
}

/// =====================================================
/// ROAD RUNNING COMPETITION METADATA
/// =====================================================

export interface RoadRunningCompetitionMetadata
  extends BaseCompetitionMetadata {
  /**
   * Official race distance.
   */
  distanceKm: number;

  /**
   * Road certification flag.
   */
  certifiedCourse?: boolean;

  /**
   * Surface type.
   *
   * Examples:
   * - asphalt
   * - mixed
   */
  surfaceType?: string;
}

/// =====================================================
/// TRIATHLON COMPETITION METADATA
/// =====================================================

export interface TriathlonCompetitionMetadata
  extends BaseCompetitionMetadata {
  /**
   * Swim distance in meters.
   */
  swimMeters: number;

  /**
   * Bike distance in kilometers.
   */
  bikeKm: number;

  /**
   * Run distance in kilometers.
   */
  runKm: number;

  /**
   * Transition areas count.
   */
  transitions?: number;

  /**
   * Draft legality.
   */
  draftingAllowed?: boolean;
}

/// =====================================================
/// HYROX COMPETITION METADATA
/// =====================================================

export interface HyroxCompetitionMetadata
  extends BaseCompetitionMetadata {
  /**
   * Competition division.
   *
   * Examples:
   * - open
   * - pro
   * - doubles
   * - relay
   */
  division: string;

  /**
   * Whether sled weight is RX/pro level.
   */
  proWeights?: boolean;

  /**
   * Workout stations included.
   */
  stations?: string[];
}

/// =====================================================
/// CROSSFIT COMPETITION METADATA
/// =====================================================

export interface CrossfitCompetitionMetadata
  extends BaseCompetitionMetadata {
  /**
   * Competition category.
   *
   * Examples:
   * - rx
   * - scaled
   * - elite
   * - masters
   */
  division: string;

  /**
   * Workout count.
   */
  workoutCount?: number;

  /**
   * Team format flag.
   */
  isTeamBased?: boolean;
}

/// =====================================================
/// CYCLING COMPETITION METADATA
/// =====================================================

export interface CyclingCompetitionMetadata
  extends BaseCompetitionMetadata {
  /**
   * Distance in kilometers.
   */
  distanceKm: number;

  /**
   * Elevation gain in meters.
   */
  elevationGainMeters?: number;

  /**
   * Surface type.
   *
   * Examples:
   * - road
   * - gravel
   * - mtb
   */
  surfaceType?: string;

  /**
   * Lap count if circuit based.
   */
  lapCount?: number;
}