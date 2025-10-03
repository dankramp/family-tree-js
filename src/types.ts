
export interface FamilyMember {
  id: number;
  name: string;
  parentIds: number[];
}

export interface FamilyData {
  members: FamilyMember[];
}

export interface MousePosition {
  x: number;
  y: number;
}