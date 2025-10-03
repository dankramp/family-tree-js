// Save JSON to file
const saveJsonBtn = document.getElementById('save-json') as HTMLButtonElement;
if (saveJsonBtn) {
  saveJsonBtn.addEventListener('click', () => {
    if (!familyData) return;
    const jsonStr = JSON.stringify(familyData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (localStorage.getItem('familyTreeData') ? (JSON.parse(localStorage.getItem('familyTreeData')!)?.fileName || 'family-data.json') : 'family-data.json');
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  });
}


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
let nodes: Node[] = [];
let nodeMap: Map<number, Node> = new Map();
let familyData: any = null;

let editMode = false;
// Edit mode toggle logic
const editToggle = document.getElementById('edit-toggle') as HTMLButtonElement;
const editIndicator = document.getElementById('edit-mode-indicator') as HTMLDivElement;
editToggle.addEventListener('click', () => {
  // If leaving edit mode, persist all member edits to localStorage
  if (editMode) {
    localStorage.setItem('familyTreeData', JSON.stringify({
      fileName: localStorage.getItem('familyTreeData') ? JSON.parse(localStorage.getItem('familyTreeData')!).fileName : '',
      data: JSON.stringify(familyData)
    }));
  }
  editMode = !editMode;
  if (editMode) {
    editToggle.textContent = 'Disable Edit Mode';
    editToggle.style.background = '#ffb347';
    editIndicator.style.display = 'block';
    document.body.style.cursor = 'crosshair';
  } else {
    editToggle.textContent = 'Enable Edit Mode';
    editToggle.style.background = '#ffe066';
    editIndicator.style.display = 'none';
    document.body.style.cursor = '';
    // Redraw to show non-editable info box
    redraw();
  }
});

function getHoveredNode() { return hoveredNode; }
function setHoveredNode(n: Node | null) { hoveredNode = n; }
function getSelectedNode() { return selectedNode; }
function setSelectedNode(n: Node | null) { selectedNode = n; }

function showInfoBox(node: Node | null) {
  const infoBox = document.getElementById('info-box') as HTMLDivElement;
  const infoContent = document.getElementById('info-content') as HTMLDivElement;
  if (node) {
    if (editMode) {
      // Editable fields in edit mode
      infoContent.innerHTML = `
        <div style="font-weight:bold; font-size:16px; margin-bottom:8px;">
          <input id="edit-name" value="${node.member.name.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" style="font-size:16px; width:90%; padding:2px 4px; border-radius:4px; border:1px solid #ccc;" />
        </div>
        <div style="font-size:14px; margin-bottom:2px;">
          Born: <input id="edit-birth" value="${node.member.birthDate.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" style="font-size:14px; width:70%; padding:2px 4px; border-radius:4px; border:1px solid #ccc;" />
        </div>
        <div style="font-size:14px;">
          Died: <input id="edit-death" value="${node.member.deathDate.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" style="font-size:14px; width:70%; padding:2px 4px; border-radius:4px; border:1px solid #ccc;" />
        </div>
      `;
      // Save changes to node object on blur/change
      setTimeout(() => {
        const nameInput = document.getElementById('edit-name') as HTMLInputElement;
        const birthInput = document.getElementById('edit-birth') as HTMLInputElement;
        const deathInput = document.getElementById('edit-death') as HTMLInputElement;
        if (nameInput && birthInput && deathInput) {
          nameInput.oninput = () => { node.member.name = nameInput.value; };
          birthInput.oninput = () => { node.member.birthDate = birthInput.value; };
          deathInput.oninput = () => { node.member.deathDate = deathInput.value; };
          nameInput.onchange = () => { redraw(); };
          birthInput.onchange = () => { redraw(); };
          deathInput.onchange = () => { redraw(); };
        }
      }, 0);
    } else {
      // Read-only in view mode
      infoContent.innerHTML = `
        <div style=\"font-weight:bold; font-size:16px; margin-bottom:8px;\">${node.member.name}</div>
        <div style=\"font-size:14px; margin-bottom:2px;\">Born: ${node.member.birthDate}</div>
        <div style=\"font-size:14px;\">Died: ${node.member.deathDate}</div>
      `;
    }
    infoBox.style.display = 'block';
    setTimeout(() => {
      infoBox.style.transform = 'scaleY(1)';
      infoBox.style.opacity = '1';
    }, 10);
  } else {
    infoBox.style.transform = 'scaleY(0.7)';
    infoBox.style.opacity = '0';
    setTimeout(() => {
      infoBox.style.display = 'none';
    }, 200);
  }
}

function redraw() {
  if (!familyData) return;
  draw(ctx, canvas, nodes, nodeMap, camera, familyData, hoveredNode, selectedNode);
  showInfoBox(selectedNode);
}

function layoutAndRedraw() {
  if (!familyData) return;
  const layout = computeFamilyLayout(
    familyData,
    canvas.width,
    NODE_RADIUS,
    HORIZONTAL_SPACING,
    VERTICAL_SPACING,
    GENERATION_COLORS
  );
  nodes = layout.nodes;
  nodeMap = layout.nodeMap;
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
  redraw();
}

function setupAppWithData(data: any) {
  familyData = data;
  layoutAndRedraw();
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
    redraw,
    () => editMode, // pass editMode getter
    addNewMemberAt // pass add member function
  );
}
// Add new member logic for edit mode
function addNewMemberAt(worldX: number, worldY: number) {
  // Prompt for info (simple prompt for now)
  const name = prompt('Enter name for new family member:');
  if (!name) return;
  const birthDate = prompt('Enter birth date (optional):', '');
  const deathDate = prompt('Enter death date (optional):', '');
  // Generate new unique id
  const maxId = familyData.members.reduce((max: number, m: any) => Math.max(max, m.id), 0);
  const newId = maxId + 1;
  const newMember = {
    id: newId,
    name,
    parentIds: [],
    birthDate: birthDate || '-',
    deathDate: deathDate || '-',
  };
  familyData.members.push(newMember);
  // Place node at worldX/worldY by updating layout after adding
  // (Layout will recalculate positions, so this is a best effort)
  layoutAndRedraw();
  // Save to localStorage
  localStorage.setItem('familyTreeData', JSON.stringify({
    fileName: localStorage.getItem('familyTreeData') ? JSON.parse(localStorage.getItem('familyTreeData')!).fileName : '',
    data: JSON.stringify(familyData)
  }));
}


const uploadInput = document.getElementById('json-upload') as HTMLInputElement;
const controlsDiv = document.getElementById('controls') as HTMLDivElement;
let fileNameDisplay: HTMLDivElement | null = null;

function setFileNameDisplay(name: string | null) {
  if (!fileNameDisplay) {
    fileNameDisplay = document.createElement('div');
    fileNameDisplay.style.fontSize = '13px';
    fileNameDisplay.style.marginTop = '10px';
    fileNameDisplay.style.opacity = '0.7';
    controlsDiv.appendChild(fileNameDisplay);
  }
  fileNameDisplay.textContent = name ? `Loaded file: ${name}` : '';
}

uploadInput.addEventListener('change', () => {
  const file = uploadInput.files && uploadInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = JSON.parse(evt.target?.result as string);
      setupAppWithData(data);
      // Store in localStorage
      localStorage.setItem('familyTreeData', JSON.stringify({
        fileName: file.name,
        data: evt.target?.result
      }));
      setFileNameDisplay(file.name);
    } catch (err) {
      alert('Invalid JSON file.');
    }
  };
  reader.readAsText(file);
});

// On page load, check localStorage for previous data
window.addEventListener('DOMContentLoaded', () => {
  const stored = localStorage.getItem('familyTreeData');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.data) {
        const data = JSON.parse(parsed.data);
        setupAppWithData(data);
        setFileNameDisplay(parsed.fileName || null);
      }
    } catch {}
  }
});

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  layoutAndRedraw();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();