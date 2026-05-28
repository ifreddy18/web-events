//////////////////////////////////////////////////////////
// SERVICE PROVIDER METADATA
//////////////////////////////////////////////////////////

export interface ServiceProviderMetadata {
  specialties?: string[];
  certifications?: string[];
  yearsExperience?: number;
  languages?: string[];
  equipment?: string[];
  socialLinks?: {
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    strava?: string;
  };
  pricing?: {
    currency?: string;
    startingPrice?: number;
  };
  availability?: {
    remote?: boolean;
    inPerson?: boolean;
  };
  tags?: string[];
}
