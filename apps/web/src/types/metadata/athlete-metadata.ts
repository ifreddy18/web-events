//////////////////////////////////////////////////////////
// ATHLETE METADATA
//////////////////////////////////////////////////////////

export interface AthleteMetadata {
  aliases?: string[];

  emergencyContact?: {
    name?: string;
    phone?: string;
  };

  federations?: string[];

  preferredDisciplines?: string[];

  equipment?: {
    bike?: string;
    shoes?: string[];
    watch?: string;
  };

  socialLinks?: {
    instagram?: string;
    strava?: string;
    youtube?: string;
  };

  achievements?: string[];

  tags?: string[];
}