import type { FamilyMember, FamilyData } from './types';


export interface Node {
  member: FamilyMember;
  generation: number;
  x: number;
  y: number;
  radius: number;
  color: string;
}


// Derive generation for each member based on parentIds and children
function computeGenerations(members: FamilyMember[]): Map<number, number> {
  const genMap = new Map<number, number>();
  // 1. Standard upward propagation (children from parents)
  let changed = true;
  for (const m of members) {
    if (!m.parentIds || m.parentIds.length === 0) {
      genMap.set(m.id, 0);
    }
  }
  while (changed) {
    changed = false;
    for (const m of members) {
      if (genMap.has(m.id)) continue;
      if (m.parentIds.every(pid => genMap.has(pid))) {
        const gen = Math.max(...m.parentIds.map(pid => genMap.get(pid)!)) + 1;
        genMap.set(m.id, gen);
        changed = true;
      }
    }
  }
  // 2. Downward propagation for roots who are co-parents (set their generation to one less than their minimum child's generation)
  // Find children for each member
  const childrenMap = new Map<number, FamilyMember[]>();
  for (const m of members) {
    for (const pid of m.parentIds) {
      if (!childrenMap.has(pid)) childrenMap.set(pid, []);
      childrenMap.get(pid)!.push(m);
    }
  }
  let changedDown = true;
  while (changedDown) {
    changedDown = false;
    for (const m of members) {
      if (m.parentIds.length === 0) {
        const children = childrenMap.get(m.id) || [];
        if (children.length > 0) {
          // Only consider children whose generation is already set
          const childGens = children.map(c => genMap.get(c.id)).filter(g => g !== undefined) as number[];
          if (childGens.length > 0) {
            const minChildGen = Math.min(...childGens);
            if (genMap.get(m.id)! < minChildGen - 1) {
              genMap.set(m.id, minChildGen - 1);
              changedDown = true;
            }
          }
        }
      }
    }
  }
  // Normalize so minimum generation is 0
  const minGen = Math.min(...Array.from(genMap.values()));
  if (minGen !== 0) {
    for (const k of genMap.keys()) {
      genMap.set(k, genMap.get(k)! - minGen);
    }
  }
  // Fallback for orphans
  for (const m of members) {
    if (!genMap.has(m.id)) genMap.set(m.id, 0);
  }
  return genMap;
}

export function computeFamilyLayout(
  familyData: FamilyData,
  canvasWidth: number,
  NODE_RADIUS: number,
  HORIZONTAL_SPACING: number,
  VERTICAL_SPACING: number,
  GENERATION_COLORS: Record<number, string>
): { nodes: Node[]; nodeMap: Map<number, Node> } {
  const nodes: Node[] = [];
  const nodeMap = new Map<number, Node>();
  const genMap = computeGenerations(familyData.members);
  // Group by generation
  const generations: FamilyMember[][] = [];
  familyData.members.forEach((member: FamilyMember) => {
    const gen = genMap.get(member.id) ?? 0;
    if (!generations[gen]) generations[gen] = [];
    generations[gen].push(member);
  });

  let offsetY = 100;
  generations.forEach((genMembers, genIndex) => {
    const genWidth = genMembers.length * HORIZONTAL_SPACING;
    let offsetX = (canvasWidth - genWidth) / 2 + HORIZONTAL_SPACING / 2;
    genMembers.forEach((member: FamilyMember) => {
      const generation = genMap.get(member.id) ?? 0;
      const node: Node = {
        member,
        generation,
        x: offsetX,
        y: offsetY,
        radius: NODE_RADIUS,
        color: GENERATION_COLORS[generation] || '#ffffff',
      };
      nodes.push(node);
      nodeMap.set(member.id, node);
      offsetX += HORIZONTAL_SPACING;
    });
    offsetY += VERTICAL_SPACING;
  });

  return { nodes, nodeMap };
}
