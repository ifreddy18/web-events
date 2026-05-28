/// =====================================================
/// EVENT EDITION METADATA
/// =====================================================
/// Flexible metadata shared by all event editions.
///
//// Examples:
/// - schedules
/// - GPX routes
/// - sponsors
/// - social links
/// - weather
/// - parking info
/// =====================================================

export interface EventEditionMetadata {
  /**
   * Main sponsor names.
   */
  sponsors?: string[];

  /**
   * Event hashtags.
   */
  hashtags?: string[];

  /**
   * Whether parking is available.
   */
  parkingAvailable?: boolean;

  /**
   * Whether hydration stations exist.
   */
  hydrationStations?: boolean;

  /**
   * GPX route files.
   */
  gpxRoutes?: string[];

  /**
   * Public weather notes.
   */
  weatherNotes?: string;

  /**
   * Public recommendations.
   */
  recommendations?: string[];

  /**
   * Social media links.
   */
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
  };

  /**
   * Important event notes.
   */
  notes?: string[];
}