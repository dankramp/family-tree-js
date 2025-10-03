import type { Node } from './familyLayout';
import type { Camera } from './camera';
import type { FamilyMember, FamilyData } from './types';

export function drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function drawNode(
  ctx: CanvasRenderingContext2D,
  node: Node,
  camera: Camera,
  canvas: HTMLCanvasElement,
  isHovered: boolean,
  isSelected: boolean,
  highlighted: boolean
) {
  const screenX = (node.x - camera.x) * camera.scale + canvas.width / 2;
  const screenY = (node.y - camera.y) * camera.scale + canvas.height / 2;
  const radius = node.radius * camera.scale;

  ctx.save();
  // Draw highlight ring first (behind node, same size as node)
  if (highlighted) {
    ctx.save();
    const highlightLineWidth = 16 * camera.scale;
    const highlightGlow = 32 * camera.scale;
    // The arc radius is reduced so the outer edge matches the node's radius
    const highlightRadius = radius - highlightLineWidth / 2;
    ctx.beginPath();
    ctx.arc(screenX, screenY, highlightRadius, 0, Math.PI * 2);
    ctx.shadowColor = '#ffe066';
    ctx.shadowBlur = highlightGlow;
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = highlightLineWidth;
    ctx.stroke();
    ctx.restore();
  }

  // Draw node on top
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  ctx.beginPath();
  ctx.arc(screenX, screenY, radius + (isHovered ? 5 : 0), 0, Math.PI * 2);
  ctx.fillStyle = node.color;
  ctx.fill();

  if (isSelected) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.max(12, 14 * camera.scale)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(node.member.name, screenX, screenY);
  ctx.restore();
}

export function draw(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  nodes: Node[],
  nodeMap: Map<number, Node>,
  camera: Camera,
  familyData: FamilyData,
  hoveredNode: Node | null,
  selectedNode: Node | null
) {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw connections
  // If a node is selected, highlight its direct connections
  let highlightEdges = new Set<string>();
  if (selectedNode) {
    // Highlight lines to parents
    if (selectedNode.member.parentIds) {
      for (const pid of selectedNode.member.parentIds) {
        highlightEdges.add(`${pid}->${selectedNode.member.id}`);
      }
    }
    // Highlight lines to children
    for (const node of nodes) {
      if (node.member.parentIds && node.member.parentIds.includes(selectedNode.member.id)) {
        highlightEdges.add(`${selectedNode.member.id}->${node.member.id}`);
      }
    }
  }

  // Draw marriage lines (dashed) for explicit marriages in the data
  if (familyData.marriages) {
    familyData.marriages.forEach(marriage => {
      const [p1, p2] = marriage.spouseIds;
      const parentNode1 = nodeMap.get(p1);
      const parentNode2 = nodeMap.get(p2);
      if (parentNode1 && parentNode2) {
        const x1 = (parentNode1.x - camera.x) * camera.scale + canvas.width / 2;
        const y1 = (parentNode1.y - camera.y) * camera.scale + canvas.height / 2;
        const x2 = (parentNode2.x - camera.x) * camera.scale + canvas.width / 2;
        const y2 = (parentNode2.y - camera.y) * camera.scale + canvas.height / 2;
        // Highlight if either spouse is selected
        const isHighlighted = selectedNode && (selectedNode.member.id === p1 || selectedNode.member.id === p2);
        if (isHighlighted) {
          ctx.save();
          ctx.setLineDash([10 * camera.scale, 8 * camera.scale]);
          ctx.strokeStyle = '#ffe066';
          ctx.lineWidth = 6 * camera.scale;
          ctx.shadowColor = '#ffe066';
          ctx.shadowBlur = 18 * camera.scale;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
        // Draw normal marriage line on top
        ctx.save();
        ctx.setLineDash([10 * camera.scale, 8 * camera.scale]);
        ctx.strokeStyle = '#ffb3c6';
        ctx.lineWidth = 3 * camera.scale;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    });
  }

  // Draw parent-child connections
  familyData.members.forEach((member: FamilyMember) => {
    if (member.parentIds && member.parentIds.length > 0) {
      const childNode = nodeMap.get(member.id);
      if (!childNode) return;
      const childScreenX = (childNode.x - camera.x) * camera.scale + canvas.width / 2;
      const childScreenY = (childNode.y - camera.y) * camera.scale + canvas.height / 2;
      member.parentIds.forEach((parentId: number) => {
        const parentNode = nodeMap.get(parentId);
        if (parentNode) {
          const parentScreenX = (parentNode.x - camera.x) * camera.scale + canvas.width / 2;
          const parentScreenY = (parentNode.y - camera.y) * camera.scale + canvas.height / 2;
          const edgeKey = `${parentId}->${member.id}`;
          if (highlightEdges.has(edgeKey)) {
            // Draw highlight line first (behind normal line)
            ctx.save();
            ctx.strokeStyle = '#ffe066';
            ctx.lineWidth = 3 * camera.scale;
            ctx.shadowColor = '#ffe066';
            ctx.shadowBlur = 10 * camera.scale;
            ctx.beginPath();
            ctx.moveTo(parentScreenX, parentScreenY);
            ctx.lineTo(childScreenX, childScreenY);
            ctx.stroke();
            ctx.restore();
          }
          // Draw normal line on top
          drawLine(ctx, parentScreenX, parentScreenY, childScreenX, childScreenY);
        }
      });
    }
  });

  // Draw nodes
  let connectedIds = new Set<number>();
  if (selectedNode) {
    connectedIds.add(selectedNode.member.id);
    // Add parents
    if (selectedNode.member.parentIds) {
      for (const pid of selectedNode.member.parentIds) connectedIds.add(pid);
    }
    // Add children
    for (const node of nodes) {
      if (node.member.parentIds && node.member.parentIds.includes(selectedNode.member.id)) {
        connectedIds.add(node.member.id);
      }
    }
  }
  nodes.forEach((node: Node) => {
    const isHovered = node === hoveredNode;
    const isSelected = node === selectedNode;
    let highlighted = false;
    if (selectedNode && connectedIds.has(node.member.id)) {
      highlighted = true;
    }
    drawNode(ctx, node, camera, canvas, isHovered, isSelected, highlighted);
  });

  // Info panel is now handled by a floating div in main.ts
}
