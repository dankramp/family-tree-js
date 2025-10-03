import familyData from '../family-data.json';
import type { FamilyMember, FamilyData } from './types';

// Type assertion for imported JSON
const typedFamilyData = familyData as FamilyData;
// Calculate positions for family members
const nodes: Node[] = [];
const nodeMap = new Map<number, Node>();

// Camera/viewport controls
let camera = {
  x: 0,
  y: 0,
  scale: 1
};

let isDragging = false;
let dragStart = { x: 0, y: 0 };
let hoveredNode: Node | null = null;
let selectedNode: Node | null = null;

// Canvas setup
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;


// Node configuration
const NODE_RADIUS = 40;
const HORIZONTAL_SPACING = 200;
const VERTICAL_SPACING = 150;
const GENERATION_COLORS: Record<number, string> = {
  0: '#4a90e2',
  1: '#50c878',
  2: '#e25d5d'
};

interface Node {
  member: FamilyMember;
  x: number;
  y: number;
  radius: number;
  color: string;
}


// Group members by generation
const generations: FamilyMember[][] = [];
typedFamilyData.members.forEach((member: FamilyMember) => {
  if (!generations[member.generation]) {
    generations[member.generation] = [];
  }
  generations[member.generation].push(member);
});

// Position nodes
let offsetY = 100;
generations.forEach((genMembers, genIndex) => {
  const genWidth = genMembers.length * HORIZONTAL_SPACING;
  let offsetX = (canvas.width - genWidth) / 2 + HORIZONTAL_SPACING / 2;
  
  genMembers.forEach((member: FamilyMember) => {
    const node: Node = {
      member,
      x: offsetX,
      y: offsetY,
      radius: NODE_RADIUS,
      color: GENERATION_COLORS[member.generation] || '#ffffff'
    };
    nodes.push(node);
    nodeMap.set(member.id, node);
    offsetX += HORIZONTAL_SPACING;
  });
  
  offsetY += VERTICAL_SPACING;
});

// Transform screen coordinates to world coordinates
function screenToWorld(screenX: number, screenY: number) {
  return {
    x: (screenX - canvas.width / 2) / camera.scale + camera.x,
    y: (screenY - canvas.height / 2) / camera.scale + camera.y
  };
}

// Check if point is inside node
function isPointInNode(x: number, y: number, node: Node): boolean {
  const dx = x - node.x;
  const dy = y - node.y;
  return Math.sqrt(dx * dx + dy * dy) <= node.radius;
}

// Draw functions
function drawLine(x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawNode(node: Node, isHovered: boolean, isSelected: boolean) {
  const screenX = (node.x - camera.x) * camera.scale + canvas.width / 2;
  const screenY = (node.y - camera.y) * camera.scale + canvas.height / 2;
  const radius = node.radius * camera.scale;
  
  // Draw shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  
  // Draw circle
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
  
  // Draw name
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.max(12, 14 * camera.scale)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(node.member.name, screenX, screenY);
}

function draw() {
  // Clear canvas
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw connections
  typedFamilyData.members.forEach((member: FamilyMember) => {
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
          drawLine(parentScreenX, parentScreenY, childScreenX, childScreenY);
        }
      });
    }
  });
  
  // Draw nodes
  nodes.forEach((node: Node) => {
    const isHovered = node === hoveredNode;
    const isSelected = node === selectedNode;
    drawNode(node, isHovered, isSelected);
  });
  
  // Draw info panel if node selected
  if (selectedNode) {
    const padding = 20;
    const panelX = 20;
    const panelY = 20;
    const panelWidth = 250;
    const panelHeight = 120;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Selected Member:', panelX + padding, panelY + padding + 20);
    
    ctx.font = 'bold 16px Arial';
    ctx.fillText(selectedNode.member.name, panelX + padding, panelY + padding + 50);
    
    ctx.font = '14px Arial';
    ctx.fillText(`Generation: ${selectedNode.member.generation}`, panelX + padding, panelY + padding + 75);
    ctx.fillText(`ID: ${selectedNode.member.id}`, panelX + padding, panelY + padding + 95);
  }
}

// Mouse events
canvas.addEventListener('mousedown', (e: MouseEvent) => {
  isDragging = true;
  dragStart = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mouseup', (e: MouseEvent) => {
  const moved = Math.abs(e.clientX - dragStart.x) > 5 || Math.abs(e.clientY - dragStart.y) > 5;
  
  if (!moved && hoveredNode) {
    selectedNode = selectedNode === hoveredNode ? null : hoveredNode;
    draw();
  }
  
  isDragging = false;
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (isDragging) {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    camera.x -= dx / camera.scale;
    camera.y -= dy / camera.scale;
    
    dragStart = { x: e.clientX, y: e.clientY };
    draw();
  } else {
    // Check for hover
    const worldPos = screenToWorld(e.clientX, e.clientY);
    let found = false;
    
    for (const node of nodes) {
      if (isPointInNode(worldPos.x, worldPos.y, node)) {
        hoveredNode = node;
        canvas.style.cursor = 'pointer';
        found = true;
        break;
      }
    }
    
    if (!found) {
      hoveredNode = null;
      canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
    }
    
    draw();
  }
});

canvas.addEventListener('wheel', (e: WheelEvent) => {
  e.preventDefault();
  
  const zoomIntensity = 0.1;
  const wheel = e.deltaY < 0 ? 1 : -1;
  const zoom = Math.exp(wheel * zoomIntensity);
  
  camera.scale *= zoom;
  camera.scale = Math.max(0.5, Math.min(3, camera.scale));
  
  draw();
});

// Set canvas size
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
}

window.addEventListener('resize', resizeCanvas);
// Initial setup
resizeCanvas();