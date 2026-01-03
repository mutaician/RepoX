// Graph Visualization Component
// D3.js force-directed graph showing file relationships

import * as d3 from 'd3';
import type { FileNode } from '../types';
import { getState, selectFile } from '../state';

// Graph node interface
interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  extension?: string;
  size?: number;
  depth: number;
  children?: string[];
}

// Graph link interface
interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

// Color scheme for file types
const FILE_COLORS: Record<string, string> = {
  // JavaScript/TypeScript
  ts: '#3178c6',
  tsx: '#3178c6',
  js: '#f7df1e',
  jsx: '#61dafb',
  
  // Web
  html: '#e34c26',
  css: '#1572b6',
  scss: '#cc6699',
  vue: '#42b883',
  svelte: '#ff3e00',
  
  // Data
  json: '#cbcb41',
  yaml: '#cb171e',
  yml: '#cb171e',
  xml: '#f26822',
  md: '#083fa1',
  
  // Languages
  py: '#3776ab',
  rb: '#cc342d',
  go: '#00add8',
  rs: '#dea584',
  java: '#ed8b00',
  
  // Config
  env: '#ecd53f',
  lock: '#8b8b8b',
  gitignore: '#f14e32',
  
  // Default
  folder: '#00d4aa',
  default: '#7d8590',
};

/**
 * Get color for a node
 */
function getNodeColor(node: GraphNode): string {
  if (node.type === 'folder') return FILE_COLORS.folder;
  const ext = node.extension?.toLowerCase() || '';
  return FILE_COLORS[ext] || FILE_COLORS.default;
}

/**
 * Get node size based on type and depth
 */
function getNodeSize(node: GraphNode): number {
  if (node.type === 'folder') {
    return Math.max(8, 16 - node.depth * 2);
  }
  // File size based on actual file size if available
  if (node.size) {
    return Math.min(12, Math.max(4, Math.log10(node.size) * 2));
  }
  return 5;
}

/**
 * Convert FileNode tree to graph data
 */
function treeToGraph(
  root: FileNode,
  maxDepth = 3,
  maxNodes = 150
): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeMap = new Map<string, GraphNode>();

  function traverse(node: FileNode, depth: number, parentId?: string): void {
    if (nodes.length >= maxNodes) return;
    if (depth > maxDepth && node.type === 'folder') return;

    const id = node.path || 'root';
    
    const graphNode: GraphNode = {
      id,
      name: node.name,
      path: node.path,
      type: node.type,
      extension: node.extension,
      size: node.size,
      depth,
      children: node.children?.map((c) => c.path),
    };
    
    nodes.push(graphNode);
    nodeMap.set(id, graphNode);

    if (parentId) {
      links.push({
        source: parentId,
        target: id,
      });
    }

    if (node.children) {
      for (const child of node.children) {
        traverse(child, depth + 1, id);
      }
    }
  }

  traverse(root, 0);

  return { nodes, links };
}

// Store simulation reference for cleanup
let simulation: d3.Simulation<GraphNode, GraphLink> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let svg: any = null;
// Store zoom behavior for controls
let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;

/**
 * Cleanup previous graph
 */
export function cleanupGraph(): void {
  if (simulation) {
    simulation.stop();
    simulation = null;
  }
  if (svg) {
    svg.remove();
    svg = null;
  }
  zoomBehavior = null;
}

/**
 * Render the graph visualization
 */
export function renderGraph(container: HTMLElement, fileTree: FileNode): void {
  cleanupGraph();

  const width = container.clientWidth;
  const height = container.clientHeight || 500;

  // Convert tree to graph data
  const { nodes, links } = treeToGraph(fileTree);

  // Create SVG
  svg = d3
    .select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height])
    .attr('class', 'graph-svg');

  // Add zoom behavior
  const g = svg.append('g');
  
  zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoomBehavior);

  // Create arrow marker for links
  svg.append('defs').append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '-0 -5 10 10')
    .attr('refX', 20)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .append('path')
    .attr('d', 'M 0,-5 L 10,0 L 0,5')
    .attr('fill', '#30363d');

  // Create force simulation
  simulation = d3
    .forceSimulation(nodes)
    .force(
      'link',
      d3.forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.id)
        .distance(50)
        .strength(0.5)
    )
    .force('charge', d3.forceManyBody().strength(-100))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(20));

  // Render links
  const link = g
    .append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', '#30363d')
    .attr('stroke-opacity', 0.6)
    .attr('stroke-width', 1);

  // Render nodes
  const node = g
    .append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('class', 'node')
    .attr('cursor', 'pointer')
    .call(
      d3.drag<SVGGElement, GraphNode>()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded)
    );

  // Node circles
  node
    .append('circle')
    .attr('r', (d: GraphNode) => getNodeSize(d))
    .attr('fill', (d: GraphNode) => getNodeColor(d))
    .attr('stroke', '#0d1117')
    .attr('stroke-width', 2);

  // Node labels
  node
    .append('text')
    .attr('dx', (d: GraphNode) => getNodeSize(d) + 4)
    .attr('dy', 4)
    .attr('font-size', '10px')
    .attr('font-family', 'JetBrains Mono, monospace')
    .attr('fill', '#e6edf3')
    .text((d: GraphNode) => d.name.length > 20 ? d.name.slice(0, 17) + '...' : d.name);

  // Tooltips
  node
    .append('title')
    .text((d: GraphNode) => `${d.path || d.name}\n${d.type === 'file' ? (d.size ? formatSize(d.size) : 'file') : 'folder'}`);

  // Click handler
  node.on('click', (event: MouseEvent, d: GraphNode) => {
    event.stopPropagation();
    
    // Find the original FileNode
    const fileNode = findNodeByPath(getState().fileTree, d.path);
    if (fileNode && fileNode.type === 'file') {
      // Use silent mode to prevent re-render (which would destroy the graph)
      selectFile(fileNode, true);
      
      // Update the file panel manually
      updateFilePanel(fileNode);
    }
    
    // Highlight selected node
    node.selectAll('circle')
      .attr('stroke', function(this: SVGCircleElement) {
        const nodeData = d3.select(this.parentNode as Element).datum() as GraphNode;
        return nodeData.id === d.id ? '#00d4aa' : '#0d1117';
      })
      .attr('stroke-width', function(this: SVGCircleElement) {
        const nodeData = d3.select(this.parentNode as Element).datum() as GraphNode;
        return nodeData.id === d.id ? 3 : 2;
      });
  });

  // Update positions on tick
  simulation.on('tick', () => {
    link
      .attr('x1', (d: GraphLink) => (d.source as GraphNode).x!)
      .attr('y1', (d: GraphLink) => (d.source as GraphNode).y!)
      .attr('x2', (d: GraphLink) => (d.target as GraphNode).x!)
      .attr('y2', (d: GraphLink) => (d.target as GraphNode).y!);

    node.attr('transform', (d: GraphNode) => `translate(${d.x},${d.y})`);
  });

  // Drag functions
  function dragStarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>): void {
    if (!event.active) simulation?.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>): void {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragEnded(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>): void {
    if (!event.active) simulation?.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  // Initial zoom to fit
  setTimeout(() => {
    const bounds = g.node()?.getBBox();
    if (bounds && svg) {
      const scale = 0.8 * Math.min(width / bounds.width, height / bounds.height);
      const translateX = width / 2 - scale * (bounds.x + bounds.width / 2);
      const translateY = height / 2 - scale * (bounds.y + bounds.height / 2);
      
      svg.transition()
        .duration(750)
        .call(
          zoomBehavior!.transform,
          d3.zoomIdentity.translate(translateX, translateY).scale(scale)
        );
    }
  }, 1000);
}

/**
 * Format file size
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Find a node by its path
 */
function findNodeByPath(root: FileNode | null, path: string): FileNode | null {
  if (!root) return null;
  if (root.path === path) return root;
  
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeByPath(child, path);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * Update file panel without full re-render (for graph mode)
 */
function updateFilePanel(file: FileNode): void {
  // Dispatch custom event that main.ts can listen for
  window.dispatchEvent(new CustomEvent('repox:fileselected', { detail: { file } }));
}

/**
 * Get graph styles
 */
export function getGraphStyles(): string {
  return `
    .graph-container {
      width: 100%;
      height: 100%;
      min-height: 400px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    
    .graph-svg {
      display: block;
    }
    
    .node:hover circle {
      filter: brightness(1.2);
    }
    
    .node text {
      pointer-events: none;
      user-select: none;
    }
    
    .graph-controls {
      position: absolute;
      top: var(--space-3);
      right: var(--space-3);
      display: flex;
      gap: var(--space-2);
    }
    
    .graph-control-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      color: var(--color-text-muted);
      cursor: pointer;
      font-size: var(--text-lg);
      transition: all var(--transition-fast);
    }
    
    .graph-control-btn:hover {
      background: var(--color-surface-hover);
      color: var(--color-text);
    }
    
    .graph-legend {
      position: absolute;
      bottom: var(--space-3);
      left: var(--space-3);
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      padding: var(--space-2);
      background: rgba(13, 17, 23, 0.9);
      border-radius: var(--radius-sm);
      font-size: var(--text-xs);
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }
    
    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
  `;
}

/**
 * Render graph container with controls
 */
export function renderGraphContainer(): string {
  return `
    <div class="graph-wrapper" style="position: relative; height: 100%;">
      <div class="graph-container" id="graph-container"></div>
      <div class="graph-controls">
        <button class="graph-control-btn" id="zoom-in-btn" title="Zoom In">+</button>
        <button class="graph-control-btn" id="zoom-out-btn" title="Zoom Out">−</button>
        <button class="graph-control-btn" id="zoom-reset-btn" title="Reset">⟲</button>
      </div>
      <div class="graph-legend">
        <div class="legend-item">
          <span class="legend-dot" style="background: #00d4aa"></span>
          <span>Folder</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #3178c6"></span>
          <span>TypeScript</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #f7df1e"></span>
          <span>JavaScript</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #e34c26"></span>
          <span>HTML</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #cbcb41"></span>
          <span>JSON</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Initialize graph with controls
 */
export function initializeGraph(fileTree: FileNode, containerEl?: HTMLElement): void {
  const container = containerEl || 
    document.getElementById('graph-container') || 
    document.getElementById('sidebar-graph-container');
  if (!container) return;

  renderGraph(container, fileTree);

  // Attach control listeners
  document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
    if (svg && zoomBehavior) {
      svg.transition().duration(300).call(zoomBehavior.scaleBy, 1.5);
    }
  });

  document.getElementById('zoom-out-btn')?.addEventListener('click', () => {
    if (svg && zoomBehavior) {
      svg.transition().duration(300).call(zoomBehavior.scaleBy, 0.67);
    }
  });

  document.getElementById('zoom-reset-btn')?.addEventListener('click', () => {
    if (svg && zoomBehavior) {
      svg.transition().duration(300).call(zoomBehavior.transform, d3.zoomIdentity);
    }
  });
}
