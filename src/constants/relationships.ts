// src/constants/relationships.ts

import type { StandardRelationship } from "../types"; 

// 1. Define the Rules
// We type the keys as 'StandardRelationship | string' so TypeScript knows we are using the import
export const INVERSE_RELATIONSHIPS: Record<StandardRelationship | string, string> = {
  // Family
  "Husband": "Wife",
  "Wife": "Husband",
  "Partner": "Partner",
  "Fiancé": "Fiancée",
  "Fiancée": "Fiancé",
  "Father-in-law": "Son-in-law", 
  "Mother-in-law": "Son-in-law",
  
  // Generational & Siblings (Base mappings)
  "Father": "Child", 
  "Mother": "Child",
  "Son": "Parent",
  "Daughter": "Parent",
  "Brother": "Sibling",
  "Sister": "Sibling",
  
  // Social
  "Friend": "Friend",
  "Best Friend": "Best Friend",
  "Childhood Friend": "Childhood Friend",
  "Acquaintance": "Acquaintance",
  "Neighbor": "Neighbor",
  "Roommate": "Roommate",
  "Enemy": "Enemy",
  "Rival": "Rival",
  "Ex-Partner": "Ex-Partner",
  "Ex-Spouse": "Ex-Spouse",
  
  // Professional
  "Boss": "Subordinate",
  "Manager": "Subordinate",
  "Subordinate": "Boss",
  "Mentor": "Mentee",
  "Mentee": "Mentor",
  "Teacher": "Student",
  "Student": "Teacher",
  "Classmate": "Classmate",
  "Colleague": "Colleague",
  "Client": "Vendor",
  "Vendor": "Client",
  "Partner (Business)": "Partner (Business)"
};

/**
 * HELPER: Calculates the exact inverse label based on the Target's sex.
 */
export function getReciprocalType(
  originalType: string, 
  targetSex: 'Male' | 'Female' | 'Other'
): string {
  const baseInverse = INVERSE_RELATIONSHIPS[originalType];

  if (!baseInverse) return "Acquaintance"; // Fallback

  // Handle "Child" -> Son/Daughter
  if (baseInverse === "Child") {
    if (targetSex === "Male") return "Son";
    if (targetSex === "Female") return "Daughter";
    return "Son/Daughter"; // Generic fallback
  }

  // Handle "Parent" -> Father/Mother
  if (baseInverse === "Parent") {
    if (targetSex === "Male") return "Father";
    if (targetSex === "Female") return "Mother";
    return "Parent";
  }

  // Handle "Sibling" -> Brother/Sister
  if (baseInverse === "Sibling") {
    if (targetSex === "Male") return "Brother";
    if (targetSex === "Female") return "Sister";
    return "Sibling";
  }

  return baseInverse;
}