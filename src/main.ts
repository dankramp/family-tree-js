
import familyData from '../family-data.json';
import { computeFamilyLayout, Node } from './familyLayout';
import { Camera } from './camera';
import { draw } from './draw';
import { setupInteraction } from './interaction';

const NODE_RADIUS = 40;
const HORIZONTAL_SPACING = 200;
const VERTICAL_SPACING = 150;
const GENERATION_COLORS: Record<number, string> = {
  0: '#4a90e2',
  1: '#50c878',
  2: '#e25d5d',
};

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let camera: Camera = { x: 0, y: 0, scale: 1 };
let hoveredNode: Node | null = null;
let selectedNode: Node | null = null;

function getHoveredNode() { return hoveredNode; }
function setHoveredNode(n: Node | null) { hoveredNode = n; }
function getSelectedNode() { return selectedNode; }
function setSelectedNode(n: Node | null) { selectedNode = n; }

function redraw() {
  draw(ctx, canvas, nodes, nodeMap, camera, familyData, hoveredNode, selectedNode);
}

function layoutAndRedraw() {
  // Recompute layout if needed (e.g. on resize)
  const layout = computeFamilyLayout(
    familyData,
    canvas.width,
    NODE_RADIUS,
    HORIZONTAL_SPACING,
    VERTICAL_SPACING,
    GENERATION_COLORS
  );
  nodes.length = 0;
  nodes.push(...layout.nodes);
  nodeMap.clear();
  layout.nodes.forEach(n => nodeMap.set(n.member.id, n));
  redraw();
}


const layout = computeFamilyLayout(
  familyData,
  window.innerWidth,
  NODE_RADIUS,
  HORIZONTAL_SPACING,
  VERTICAL_SPACING,
  GENERATION_COLORS
);
const nodes: Node[] = layout.nodes;
const nodeMap: Map<number, Node> = layout.nodeMap;

// Center camera on the tree's bounding box
if (nodes.length > 0) {
  let minX = nodes[0].x, maxX = nodes[0].x, minY = nodes[0].y, maxY = nodes[0].y;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }
  camera.x = (minX + maxX) / 2;
  camera.y = (minY + maxY) / 2;
}

setupInteraction(
  canvas,
  ctx,
  nodes,
  nodeMap,
  camera,
  familyData,
  getHoveredNode,
  setHoveredNode,
  getSelectedNode,
  setSelectedNode,
  redraw
);

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  layoutAndRedraw();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();