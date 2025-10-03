
export interface FamilyMember {
  id: number;
  name: string;
  parentIds: number[];
  birthDate: string;
  deathDate: string;
}

export interface FamilyData {
  members: FamilyMember[];
}

export interface MousePosition {
  x: number;
  y: number;
}