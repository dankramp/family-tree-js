
export interface FamilyMember {
  id: number;
  name: string;
  parentIds: number[];
  birthDate: string;
  deathDate: string;
}


export interface FamilyData {
  members: FamilyMember[];
  marriages: Marriage[];
}

export interface Marriage {
  spouseIds: [number, number];
}

export interface MousePosition {
  x: number;
  y: number;
}