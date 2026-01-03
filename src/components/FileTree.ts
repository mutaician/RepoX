// File Tree Component
// Renders the repository file tree in a sidebar

import type { FileNode } from '../types';
import { getState, selectFile } from '../state';

// File type icons (using simple ASCII/Unicode)
const FILE_ICONS: Record<string, string> = {
  // Languages
  ts: '📘',
  tsx: '📘',
  js: '📒',
  jsx: '📒',
  py: '🐍',
  rb: '💎',
  go: '🔵',
  rs: '🦀',
  java: '☕',
  kt: '🟣',
  swift: '🧡',
  c: '🔷',
  cpp: '🔷',
  h: '🔷',
  cs: '🟢',
  php: '🐘',
  
  // Web
  html: '🌐',
  css: '🎨',
  scss: '🎨',
  sass: '🎨',
  less: '🎨',
  vue: '💚',
  svelte: '🧡',
  
  // Data
  json: '📋',
  yaml: '📋',
  yml: '📋',
  xml: '📋',
  toml: '📋',
  
  // Docs
  md: '📝',
  txt: '📄',
  rst: '📝',
  
  // Config
  env: '⚙️',
  gitignore: '⚙️',
  dockerfile: '🐳',
  
  // Default
  default: '📄',
  folder: '📁',
  folderOpen: '📂',
};

/**
 * Get icon for file based on extension
 */
function getFileIcon(node: FileNode, isOpen = false): string {
  if (node.type === 'folder') {
    return isOpen ? FILE_ICONS.folderOpen : FILE_ICONS.folder;
  }
  
  const ext = node.extension?.toLowerCase() || '';
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

/**
 * Track expanded folders
 */
const expandedFolders = new Set<string>();

/**
 * Toggle folder expansion
 */
export function toggleFolder(path: string): void {
  if (expandedFolders.has(path)) {
    expandedFolders.delete(path);
  } else {
    expandedFolders.add(path);
  }
  // Re-render will be triggered by the main app
}

/**
 * Render a single tree node
 */
function renderNode(node: FileNode, depth = 0): string {
  const indent = depth * 16;
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = getState().selectedFile?.path === node.path;
  const icon = getFileIcon(node, isExpanded);
  
  if (node.type === 'folder') {
    const childrenHtml = isExpanded && node.children
      ? node.children.map((child) => renderNode(child, depth + 1)).join('')
      : '';
    
    return `
      <div class="tree-node folder ${isExpanded ? 'expanded' : ''}" 
           style="padding-left: ${indent}px"
           data-path="${node.path}"
           data-type="folder">
        <span class="tree-icon">${icon}</span>
        <span class="tree-name">${node.name}</span>
        <span class="tree-chevron">${isExpanded ? '▼' : '▶'}</span>
      </div>
      ${childrenHtml}
    `;
  }
  
  return `
    <div class="tree-node file ${isSelected ? 'selected' : ''}"
         style="padding-left: ${indent}px"
         data-path="${node.path}"
         data-type="file">
      <span class="tree-icon">${icon}</span>
      <span class="tree-name">${node.name}</span>
      ${node.size ? `<span class="tree-size">${formatSize(node.size)}</span>` : ''}
    </div>
  `;
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
 * Render the complete file tree
 */
export function renderFileTree(root: FileNode): string {
  // Expand root by default
  if (!expandedFolders.has(root.path)) {
    expandedFolders.add(root.path);
  }
  
  return `
    <div class="file-tree" id="file-tree">
      ${root.children?.map((child) => renderNode(child, 0)).join('') || ''}
    </div>
  `;
}

/**
 * Attach event listeners to the file tree
 */
export function attachFileTreeListeners(): void {
  const tree = document.getElementById('file-tree');
  if (!tree) return;
  
  tree.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('.tree-node') as HTMLElement;
    if (!target) return;
    
    const path = target.dataset.path || '';
    const type = target.dataset.type;
    
    if (type === 'folder') {
      toggleFolder(path);
      // Trigger re-render via custom event
      window.dispatchEvent(new CustomEvent('repox:rerender'));
    } else if (type === 'file') {
      // Find the file node in the tree
      const fileNode = findNodeByPath(getState().fileTree, path);
      if (fileNode) {
        selectFile(fileNode);
      }
    }
  });
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
 * Get file tree CSS styles
 */
export function getFileTreeStyles(): string {
  return `
    .file-tree {
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      overflow-y: auto;
      overflow-x: hidden;
    }
    
    .tree-node {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      cursor: pointer;
      transition: background var(--transition-fast);
      white-space: nowrap;
    }
    
    .tree-node:hover {
      background: var(--color-surface-hover);
    }
    
    .tree-node.selected {
      background: var(--color-accent-primary);
      color: var(--color-bg);
    }
    
    .tree-node.selected .tree-size {
      color: var(--color-bg);
      opacity: 0.7;
    }
    
    .tree-icon {
      flex-shrink: 0;
      width: 18px;
      text-align: center;
    }
    
    .tree-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .tree-size {
      font-size: var(--text-xs);
      color: var(--color-text-subtle);
    }
    
    .tree-chevron {
      font-size: 10px;
      color: var(--color-text-muted);
      margin-left: auto;
    }
    
    .folder .tree-name {
      font-weight: 500;
    }
  `;
}
