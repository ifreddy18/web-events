//////////////////////////////////////////////////////////
// DISCIPLINE METADATA TYPES
//////////////////////////////////////////////////////////

/// =====================================================
/// BaseDisciplineMetadata
/// =====================================================
/// Shared metadata structure for all disciplines.
/// =====================================================

export interface BaseDisciplineMetadata {
  //////////////////////////////////////////////////////////
  // Discipline classification
  //////////////////////////////////////////////////////////

  enduranceFocused?: boolean;

  technical?: boolean;

  //////////////////////////////////////////////////////////
  // Search optimization
  //////////////////////////////////////////////////////////

  keywords?: string[];
}

//////////////////////////////////////////////////////////
// RUNNING DISCIPLINES
//////////////////////////////////////////////////////////

export interface TrailRunningMetadata extends BaseDisciplineMetadata {
  terrain: string[];
  elevationBased: boolean;
}

export interface RoadRunningMetadata extends BaseDisciplineMetadata {
  terrain: string[];
  elevationBased: boolean;
}

export interface UltraRunningMetadata extends BaseDisciplineMetadata {
  ultraDistance: boolean;
}

//////////////////////////////////////////////////////////
// MULTISPORT DISCIPLINES
//////////////////////////////////////////////////////////

export interface MultisportMetadata extends BaseDisciplineMetadata {
  segments: string[];
  swimDistance?: number;
  bikeDistance?: number;
  runDistance?: number;
}

//////////////////////////////////////////////////////////
// FITNESS DISCIPLINES
//////////////////////////////////////////////////////////

export interface CrossfitMetadata extends BaseDisciplineMetadata {
  workoutBased: boolean;
  strengthFocused: boolean;
}

export interface HyroxMetadata extends BaseDisciplineMetadata {
  hybridCompetition: boolean;
}

//////////////////////////////////////////////////////////
// CYCLING DISCIPLINES
//////////////////////////////////////////////////////////

export interface CyclingMetadata extends BaseDisciplineMetadata {
  terrain: string[];
}
