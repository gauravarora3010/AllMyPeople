// src/types.ts

// --- 1. Relationship Constants (The Modern Way) ---

export const RelTypeFamily = {
  Father: "Father", Mother: "Mother", Son: "Son", Daughter: "Daughter",
  Brother: "Brother", Sister: "Sister",
  Grandfather: "Grandfather", Grandmother: "Grandmother",
  Grandson: "Grandson", Granddaughter: "Granddaughter",
  Husband: "Husband", Wife: "Wife", Partner: "Partner",
  Fiance: "Fiancé", Fiancee: "Fiancée",
  Uncle: "Uncle", Aunt: "Aunt", Nephew: "Nephew", Niece: "Niece", Cousin: "Cousin",
  FatherInLaw: "Father-in-law", MotherInLaw: "Mother-in-law",
  BrotherInLaw: "Brother-in-law", SisterInLaw: "Sister-in-law",
  SonInLaw: "Son-in-law", DaughterInLaw: "Daughter-in-law",
  Stepfather: "Stepfather", Stepmother: "Stepmother",
  Stepson: "Stepson", Stepdaughter: "Stepdaughter"
} as const;

export const RelTypeSocial = {
  Friend: "Friend", BestFriend: "Best Friend", ChildhoodFriend: "Childhood Friend",
  Acquaintance: "Acquaintance", Neighbor: "Neighbor", Roommate: "Roommate",
  Enemy: "Enemy", Rival: "Rival", ExPartner: "Ex-Partner", ExSpouse: "Ex-Spouse"
} as const;

export const RelTypeProfessional = {
  Colleague: "Colleague", Boss: "Boss", Manager: "Manager",
  Subordinate: "Subordinate", Mentor: "Mentor", Mentee: "Mentee",
  Client: "Client", Vendor: "Vendor", BusinessPartner: "Partner (Business)",
  Teacher: "Teacher", Student: "Student", Classmate: "Classmate"
} as const;

// --- Helper Types to extract values from the constants ---
export type FamilyValue = typeof RelTypeFamily[keyof typeof RelTypeFamily];
export type SocialValue = typeof RelTypeSocial[keyof typeof RelTypeSocial];
export type ProfessionalValue = typeof RelTypeProfessional[keyof typeof RelTypeProfessional];

// Union type for all standard relationships
export type StandardRelationship = FamilyValue | SocialValue | ProfessionalValue;

// The Edge Attribute structure
export interface RelationshipAttributes {
  category: 'Family' | 'Social' | 'Professional' | 'Other';
  type: StandardRelationship | string; // string allows for "Other" custom input
  label?: string; 
}

// --- 2. Person (Node) Structure ---

export interface PersonAttributes {
  // Core Identity
  id: string;
  fullName: string;
  nickname?: string;
  dob?: string; // ISO Date string YYYY-MM-DD
  sex?: 'Male' | 'Female' | 'Other';
  location?: string;
  profession?: string;

  // Visuals
  photoUrl?: string; 
  x: number; 
  y: number; 
  size: number; 
  color: string; 
  type?: string; 

  // Contact 
  phone?: string;
  mobile?: string;
  email?: string;
  
  // Social Links
  instagram?: string;
  facebook?: string;

  // Meta
  notes?: string;
}

export interface GraphData {
  nodes: PersonAttributes[];
  edges: { source: string; target: string; attributes: RelationshipAttributes }[];
}