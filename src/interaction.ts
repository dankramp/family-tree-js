import type { Node } from './familyLayout';
import type { Camera } from './camera';
import type { FamilyData } from './types';
import { animateCameraTo } from './camera';
import { draw } from './draw';

export function setupInteraction(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  nodes: Node[],
  nodeMap: Map<number, Node>,
  camera: Camera,
  familyData: FamilyData,
  getHoveredNode: () => Node | null,
  setHoveredNode: (n: Node | null) => void,
  getSelectedNode: () => Node | null,
  setSelectedNode: (n: Node | null) => void,
  redraw: () => void,
  getEditMode?: () => boolean,
  addNewMemberAt?: (x: number, y: number) => void
) {
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };

  function screenToWorld(screenX: number, screenY: number) {
    return {
      x: (screenX - canvas.width / 2) / camera.scale + camera.x,
      y: (screenY - canvas.height / 2) / camera.scale + camera.y,
    };
  }

  function isPointInNode(x: number, y: number, node: Node): boolean {
    const dx = x - node.x;
    const dy = y - node.y;
    return Math.sqrt(dx * dx + dy * dy) <= node.radius;
  }

  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    if (getEditMode && getEditMode()) {
      // In edit mode, clicking empty space adds a new member
      const worldPos = screenToWorld(e.clientX, e.clientY);
      // Only add if not clicking on a node
      let onNode = false;
      for (const node of nodes) {
        if (isPointInNode(worldPos.x, worldPos.y, node)) {
          onNode = true;
          break;
        }
      }
      if (!onNode && addNewMemberAt) {
        addNewMemberAt(worldPos.x, worldPos.y);
      }
      return;
    }
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('mouseup', (e: MouseEvent) => {
    const moved = Math.abs(e.clientX - dragStart.x) > 5 || Math.abs(e.clientY - dragStart.y) > 5;
    const hoveredNode = getHoveredNode();
    if (!moved) {
      if (hoveredNode) {
        if (getSelectedNode() === hoveredNode) {
          setSelectedNode(null);
          redraw();
        } else {
          setSelectedNode(hoveredNode);
          // Animate camera to node
          const targetScale = 2;
          const targetX = hoveredNode.x;
          const targetY = hoveredNode.y;
          animateCameraTo(camera, { x: targetX, y: targetY, scale: targetScale }, 700, redraw);
        }
      } else {
        // Clicked on empty space: deselect
        if (getSelectedNode() !== null) {
          setSelectedNode(null);
          redraw();
        }
      }
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
      redraw();
    } else {
      // Check for hover
      const worldPos = screenToWorld(e.clientX, e.clientY);
      let found = false;
      for (const node of nodes) {
        if (isPointInNode(worldPos.x, worldPos.y, node)) {
          setHoveredNode(node);
          canvas.style.cursor = 'pointer';
          found = true;
          break;
        }
      }
      if (!found) {
        setHoveredNode(null);
        canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
      }
      redraw();
    }
  });

  canvas.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    const zoomIntensity = 0.035; // Lower = slower zoom
    const wheel = e.deltaY < 0 ? 1 : -1;
    const zoom = Math.exp(wheel * zoomIntensity);
    camera.scale *= zoom;
    camera.scale = Math.max(0.5, Math.min(3, camera.scale));
    redraw();
  });
}
