import type { FamilyMember, FamilyData } from './types';

export interface Node {
  member: FamilyMember;
  x: number;
  y: number;
  radius: number;
  color: string;
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
  const generations: FamilyMember[][] = [];

  familyData.members.forEach((member: FamilyMember) => {
    if (!generations[member.generation]) {
      generations[member.generation] = [];
    }
    generations[member.generation].push(member);
  });

  let offsetY = 100;
  generations.forEach((genMembers) => {
    const genWidth = genMembers.length * HORIZONTAL_SPACING;
    let offsetX = (canvasWidth - genWidth) / 2 + HORIZONTAL_SPACING / 2;
    genMembers.forEach((member: FamilyMember) => {
      const node: Node = {
        member,
        x: offsetX,
        y: offsetY,
        radius: NODE_RADIUS,
        color: GENERATION_COLORS[member.generation] || '#ffffff',
      };
      nodes.push(node);
      nodeMap.set(member.id, node);
      offsetX += HORIZONTAL_SPACING;
    });
    offsetY += VERTICAL_SPACING;
  });

  return { nodes, nodeMap };
}
