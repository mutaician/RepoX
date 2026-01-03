// RepoX - Main Entry Point
import './style.css';
import {
  getState,
  subscribe,
  setLoading,
  setError,
  setRepoUrl,
  setRepoData,
  goToLanding,
} from './state';
import {
  isValidGitHubUrl,
  parseGitHubUrl,
  fetchRepository,
  getRateLimitInfo,
} from './services';
import {
  renderFileTree,
  attachFileTreeListeners,
  getFileTreeStyles,
  initializeGraph,
  getGraphStyles,
  cleanupGraph,
} from './components';

// ASCII Art for the landing page
const ASCII_ART = `
    ____                  _  __
   / __ \\___  ____  ____ | |/ /
  / /_/ / _ \\/ __ \\/ __ \\|   / 
 / _, _/  __/ /_/ / /_/ /   |  
/_/ |_|\\___/ .___/\\____/_/|_|  
          /_/                  
`;

/**
 * Render the header
 */
function renderHeader(): string {
  const state = getState();
  const rateLimit = getRateLimitInfo();
  
  return `
    <header class="header">
      <div class="header-content">
        <div class="logo" ${state.view === 'repo' ? 'id="back-to-home" style="cursor: pointer"' : ''}>
          <span class="logo-icon">&gt;_</span>
          <span>RepoX</span>
        </div>
        <div class="header-right">
          <span class="rate-limit ${rateLimit.remaining < 10 ? 'warning' : ''}">
            API: ${rateLimit.remaining}/${rateLimit.limit}
          </span>
          ${state.currentRepo ? `
            <a href="${state.currentRepo.url}" target="_blank" rel="noopener" class="btn btn-ghost">
              View on GitHub
            </a>
          ` : ''}
        </div>
      </div>
    </header>
  `;
}

/**
 * Render landing page
 */
function renderLanding(): string {
  const state = getState();
  
  return `
    <section class="landing">
      <pre class="ascii-decoration">${ASCII_ART}</pre>
      
      <h1 class="landing-title">
        Learn from <span class="accent">GitHub Repos</span>
      </h1>
      
      <p class="landing-subtitle">
        Transform any repository into an interactive learning experience. 
        Visualize architecture, get AI explanations, and master codebases faster.
      </p>

      <div class="repo-input-wrapper">
        <input 
          type="text" 
          class="input" 
          id="repo-url-input"
          placeholder="https://github.com/owner/repo"
          value="${state.repoUrl}"
        />
        <button class="btn btn-primary" id="explore-btn" ${state.loading ? 'disabled' : ''}>
          ${state.loading ? '<span class="spinner"></span> Loading' : 'Explore'}
        </button>
      </div>

      ${state.error ? `
        <div class="error-message">
          <span>⚠</span>
          <span>${state.error}</span>
        </div>
      ` : ''}

      <div class="features">
        <div class="feature-pill">
          <span class="icon">◈</span>
          <span>Interactive Graphs</span>
        </div>
        <div class="feature-pill">
          <span class="icon">◈</span>
          <span>AI Explanations</span>
        </div>
        <div class="feature-pill">
          <span class="icon">◈</span>
          <span>Learning Paths</span>
        </div>
        <div class="feature-pill">
          <span class="icon">◈</span>
          <span>Code Challenges</span>
        </div>
      </div>
    </section>
  `;
}

/**
 * Render repo info bar
 */
function renderRepoInfo(): string {
  const repo = getState().currentRepo;
  if (!repo) return '';
  
  return `
    <div class="repo-info-bar">
      <div class="repo-name">
        <span class="repo-icon">📦</span>
        <span>${repo.fullName}</span>
      </div>
      <div class="repo-stats">
        ${repo.language ? `<span class="stat"><span class="stat-icon">●</span> ${repo.language}</span>` : ''}
        <span class="stat">⭐ ${formatNumber(repo.stars)}</span>
        <span class="stat">🔱 ${formatNumber(repo.forks)}</span>
      </div>
    </div>
    ${repo.description ? `<p class="repo-description">${repo.description}</p>` : ''}
  `;
}

/**
 * Format large numbers
 */
function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

/**
 * Render repo view
 */
function renderRepoView(): string {
  const state = getState();
  if (!state.fileTree) return '';
  
  // Get current tab from localStorage or default to 'tree'
  const currentTab = localStorage.getItem('repox_view_tab') || 'tree';
  
  return `
    <div class="repo-view ${currentTab === 'graph' ? 'graph-mode' : ''}">
      <aside class="sidebar">
        <div class="sidebar-header">
          ${renderRepoInfo()}
        </div>
        <div class="sidebar-tabs">
          <button class="tab-btn ${currentTab === 'tree' ? 'active' : ''}" data-tab="tree">
            📁 Tree
          </button>
          <button class="tab-btn ${currentTab === 'graph' ? 'active' : ''}" data-tab="graph">
            🔗 Graph
          </button>
        </div>
        <div class="sidebar-content">
          ${renderFileTree(state.fileTree)}
        </div>
      </aside>
      <main class="content-area">
        ${currentTab === 'graph' 
          ? renderGraphPanel() 
          : (state.selectedFile ? renderFilePanel() : renderWelcomePanel())
        }
      </main>
    </div>
  `;
}

/**
 * Render full-size graph panel
 */
function renderGraphPanel(): string {
  return `
    <div class="graph-panel">
      <div class="graph-panel-header">
        <h3>Repository Architecture</h3>
        <div class="graph-controls-inline">
          <button class="btn btn-ghost btn-sm" id="zoom-in-btn">+</button>
          <button class="btn btn-ghost btn-sm" id="zoom-out-btn">−</button>
          <button class="btn btn-ghost btn-sm" id="zoom-reset-btn">Reset</button>
        </div>
      </div>
      <div class="graph-full-container" id="graph-container"></div>
      <div class="graph-legend-inline">
        <span class="legend-item"><span class="legend-dot" style="background: #00d4aa"></span> Folder</span>
        <span class="legend-item"><span class="legend-dot" style="background: #3178c6"></span> TypeScript</span>
        <span class="legend-item"><span class="legend-dot" style="background: #f7df1e"></span> JavaScript</span>
        <span class="legend-item"><span class="legend-dot" style="background: #e34c26"></span> HTML</span>
        <span class="legend-item"><span class="legend-dot" style="background: #1572b6"></span> CSS</span>
        <span class="legend-item"><span class="legend-dot" style="background: #cbcb41"></span> JSON</span>
      </div>
    </div>
  `;
}

/**
 * Render welcome panel when no file is selected
 */
function renderWelcomePanel(): string {
  const fileCount = countFiles(getState().fileTree);
  
  return `
    <div class="welcome-panel">
      <div class="welcome-icon">📂</div>
      <h2>Select a file to explore</h2>
      <p class="text-muted">
        This repository contains ${fileCount} files. 
        Click on any file in the sidebar to view details and get AI explanations.
      </p>
      <div class="welcome-actions">
        <button class="btn btn-primary" id="generate-path-btn" disabled>
          Generate Learning Path (Coming in Step 5)
        </button>
      </div>
    </div>
  `;
}

/**
 * Render file panel
 */
function renderFilePanel(): string {
  const file = getState().selectedFile;
  if (!file) return '';
  
  const eli5Enabled = localStorage.getItem('repox_eli5') === 'true';
  
  return `
    <div class="file-panel">
      <div class="file-panel-header">
        <h3 class="file-panel-title">
          <span class="file-icon">📄</span>
          ${file.name}
        </h3>
        <span class="file-path text-muted">${file.path}</span>
      </div>
      <div class="file-panel-content">
        <div class="file-actions">
          <button class="btn btn-primary" id="explain-btn">
            Explain with AI
          </button>
          <button class="btn btn-ghost" id="view-raw-btn">
            View Raw
          </button>
          <label class="eli5-toggle">
            <input type="checkbox" id="eli5-checkbox" ${eli5Enabled ? 'checked' : ''}>
            <span>ELI5 Mode</span>
          </label>
        </div>
        <div class="file-preview" id="file-preview">
          <p class="text-muted">Click "Explain with AI" for an AI-powered explanation, or "View Raw" to see file contents.</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Count files in tree
 */
function countFiles(node: import('./types').FileNode | null): number {
  if (!node) return 0;
  if (node.type === 'file') return 1;
  return node.children?.reduce((sum, child) => sum + countFiles(child), 0) || 0;
}

/**
 * Main render function
 */
function render(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;
  
  const state = getState();

  // Inject dynamic styles
  const styleId = 'repox-dynamic-styles';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = getFileTreeStyles() + getGraphStyles() + getRepoViewStyles();

  app.innerHTML = `
    ${renderHeader()}
    <main class="main">
      ${state.view === 'landing' ? renderLanding() : renderRepoView()}
    </main>
    <footer class="footer">
      <p>Built for Hacks for Hackers 2026 | Powered by Gemini, MongoDB, Cloudflare</p>
    </footer>
  `;

  attachEventListeners();
}

/**
 * Get repo view styles
 */
function getRepoViewStyles(): string {
  return `
    .header-right {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }
    
    .rate-limit {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      padding: var(--space-1) var(--space-2);
      background: var(--color-surface);
      border-radius: var(--radius-sm);
    }
    
    .rate-limit.warning {
      color: var(--color-warning);
      border: 1px solid var(--color-warning);
    }
    
    .repo-view {
      display: grid;
      grid-template-columns: var(--sidebar-width) 1fr;
      height: calc(100vh - var(--header-height) - 60px);
      overflow: hidden;
    }
    
    .sidebar {
      background: var(--color-surface);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .sidebar-header {
      padding: var(--space-4);
      border-bottom: 1px solid var(--color-border);
    }
    
    .sidebar-tabs {
      display: flex;
      border-bottom: 1px solid var(--color-border);
    }
    
    .tab-btn {
      flex: 1;
      padding: var(--space-3);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--color-text-muted);
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    
    .tab-btn:hover {
      background: var(--color-surface-hover);
      color: var(--color-text);
    }
    
    .tab-btn.active {
      color: var(--color-accent-primary);
      border-bottom-color: var(--color-accent-primary);
    }
    
    .sidebar-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
    }
    
    .sidebar-graph {
      width: 100%;
      height: 100%;
      min-height: 300px;
    }
    
    .repo-info-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: wrap;
    }
    
    .repo-name {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-family: var(--font-mono);
      font-weight: 600;
      font-size: var(--text-sm);
    }
    
    .repo-stats {
      display: flex;
      gap: var(--space-3);
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    
    .stat {
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }
    
    .repo-description {
      margin-top: var(--space-3);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      line-height: 1.4;
    }
    
    .content-area {
      background: var(--color-bg);
      overflow-y: auto;
      padding: var(--space-6);
    }
    
    .welcome-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: var(--space-8);
    }
    
    .welcome-icon {
      font-size: 4rem;
      margin-bottom: var(--space-4);
    }
    
    .welcome-panel h2 {
      margin-bottom: var(--space-2);
    }
    
    .welcome-panel p {
      max-width: 400px;
      margin-bottom: var(--space-6);
    }
    
    .file-panel {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .file-panel-header {
      margin-bottom: var(--space-4);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--color-border);
    }
    
    .file-panel-title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-1);
    }
    
    .file-path {
      font-family: var(--font-mono);
      font-size: var(--text-sm);
    }
    
    .file-actions {
      display: flex;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
    }
    
    .file-preview {
      flex: 1;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-4);
      overflow: auto;
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      white-space: pre-wrap;
    }
    
    .eli5-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      cursor: pointer;
      margin-left: auto;
    }
    
    .eli5-toggle input {
      accent-color: var(--color-accent-primary);
    }
    
    .ai-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      text-align: center;
    }
    
    .ai-explanation {
      line-height: 1.6;
    }
    
    .ai-explanation h2, .ai-explanation h3, .ai-explanation h4 {
      margin-top: var(--space-4);
      margin-bottom: var(--space-2);
      color: var(--color-accent-primary);
    }
    
    .ai-explanation code {
      background: var(--color-bg);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
    }
    
    .ai-explanation pre {
      background: var(--color-bg);
      padding: var(--space-3);
      border-radius: var(--radius-md);
      overflow-x: auto;
    }
    
    .ai-explanation ul, .ai-explanation ol {
      margin: var(--space-2) 0;
      padding-left: var(--space-5);
    }
    
    .ai-error {
      padding: var(--space-4);
      background: rgba(255, 107, 53, 0.1);
      border: 1px solid var(--color-accent-secondary);
      border-radius: var(--radius-md);
    }
    
    /* Graph Panel Styles */
    .graph-panel {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .graph-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-4);
      padding-bottom: var(--space-3);
      border-bottom: 1px solid var(--color-border);
    }
    
    .graph-panel-header h3 {
      margin: 0;
    }
    
    .graph-controls-inline {
      display: flex;
      gap: var(--space-2);
    }
    
    .btn-sm {
      padding: var(--space-2) var(--space-3);
      font-size: var(--text-xs);
    }
    
    .graph-full-container {
      flex: 1;
      min-height: 400px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    
    .graph-legend-inline {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
      padding: var(--space-3) 0;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }
    
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    
    .graph-file-info {
      display: none;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      background: var(--color-accent-primary);
      color: var(--color-bg);
      border-radius: var(--radius-md);
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      margin-top: var(--space-2);
    }
    
    .file-info-icon {
      font-size: var(--text-lg);
    }
    
    .file-info-name {
      font-weight: 600;
    }
    
    .file-info-path {
      opacity: 0.8;
      font-size: var(--text-xs);
    }
    
    .file-info-size {
      margin-left: auto;
      opacity: 0.8;
    }
    
    @media (max-width: 768px) {
      .repo-view {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr;
      }
      
      .sidebar {
        max-height: 40vh;
      }
    }
  `;
}

/**
 * Attach event listeners
 */
function attachEventListeners(): void {
  const state = getState();
  
  if (state.view === 'landing') {
    const input = document.querySelector<HTMLInputElement>('#repo-url-input');
    const button = document.querySelector<HTMLButtonElement>('#explore-btn');

    if (input) {
      input.addEventListener('input', (e) => {
        setRepoUrl((e.target as HTMLInputElement).value);
      });

      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleExplore();
        }
      });
      
      // Focus the input
      input.focus();
    }

    if (button) {
      button.addEventListener('click', handleExplore);
    }
  } else {
    // Repo view listeners
    const currentTab = localStorage.getItem('repox_view_tab') || 'tree';
    
    // Always attach file tree listeners (sidebar is always visible)
    attachFileTreeListeners();
    
    if (currentTab === 'graph') {
      // Initialize graph in main content area
      const graphContainer = document.getElementById('graph-container');
      const fileTree = getState().fileTree;
      if (graphContainer && fileTree) {
        initializeGraph(fileTree, graphContainer);
      }
    }
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tab = (e.target as HTMLElement).dataset.tab;
        if (tab) {
          cleanupGraph();
          localStorage.setItem('repox_view_tab', tab);
          render();
        }
      });
    });
    
    const backBtn = document.getElementById('back-to-home');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        cleanupGraph();
        goToLanding();
      });
    }
    
    const viewRawBtn = document.getElementById('view-raw-btn');
    if (viewRawBtn) {
      viewRawBtn.addEventListener('click', handleViewRaw);
    }
    
    const explainBtn = document.getElementById('explain-btn');
    if (explainBtn) {
      explainBtn.addEventListener('click', handleExplain);
    }
    
    const eli5Checkbox = document.getElementById('eli5-checkbox') as HTMLInputElement;
    if (eli5Checkbox) {
      eli5Checkbox.addEventListener('change', () => {
        localStorage.setItem('repox_eli5', eli5Checkbox.checked.toString());
      });
    }
  }
}

/**
 * Handle explore button click
 */
async function handleExplore(): Promise<void> {
  const url = getState().repoUrl.trim();

  if (!url) {
    setError('Please enter a GitHub repository URL');
    return;
  }

  if (!isValidGitHubUrl(url)) {
    setError('Invalid GitHub URL. Format: https://github.com/owner/repo');
    return;
  }

  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    setError('Could not parse repository URL');
    return;
  }

  setLoading(true);

  try {
    const { info, tree } = await fetchRepository(parsed.owner, parsed.repo);
    setRepoData(info, tree);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to fetch repository');
  }
}

/**
 * Handle view raw button
 */
async function handleViewRaw(): Promise<void> {
  const state = getState();
  const file = state.selectedFile;
  const repo = state.currentRepo;
  
  if (!file || !repo) return;
  
  const preview = document.getElementById('file-preview');
  if (!preview) return;
  
  preview.innerHTML = '<span class="text-muted">Loading...</span>';
  
  try {
    const { fetchFileContent } = await import('./services');
    const content = await fetchFileContent(repo.owner, repo.repo, file.path);
    preview.textContent = content;
  } catch (err) {
    preview.innerHTML = `<span class="error-message">Failed to load file: ${err instanceof Error ? err.message : 'Unknown error'}</span>`;
  }
}

/**
 * Handle explain button - calls Gemini AI
 */
async function handleExplain(): Promise<void> {
  const state = getState();
  const file = state.selectedFile;
  const repo = state.currentRepo;
  
  if (!file || !repo) return;
  
  const preview = document.getElementById('file-preview');
  const explainBtn = document.getElementById('explain-btn') as HTMLButtonElement;
  if (!preview) return;
  
  // Show loading state
  preview.innerHTML = `
    <div class="ai-loading">
      <div class="spinner"></div>
      <p>Analyzing file with AI...</p>
      <p class="text-muted">This may take a few seconds</p>
    </div>
  `;
  if (explainBtn) explainBtn.disabled = true;
  
  try {
    // First fetch the file content
    const { fetchFileContent, explainFile } = await import('./services');
    const content = await fetchFileContent(repo.owner, repo.repo, file.path);
    
    // Check ELI5 mode
    const eli5Enabled = localStorage.getItem('repox_eli5') === 'true';
    
    // Then call Gemini API
    const explanation = await explainFile({
      fileName: file.name,
      filePath: file.path,
      fileContent: content,
      repoContext: `Repository: ${repo.fullName}${repo.description ? ` - ${repo.description}` : ''}`,
      eli5: eli5Enabled,
    });
    
    // Render markdown (simple conversion)
    preview.innerHTML = `
      <div class="ai-explanation">
        ${renderMarkdown(explanation)}
      </div>
    `;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    preview.innerHTML = `
      <div class="ai-error">
        <p><strong>Failed to get AI explanation</strong></p>
        <p class="text-muted">${errorMessage}</p>
        <p class="text-muted">Make sure the Cloudflare Worker is running: <code>cd worker && bun run dev</code></p>
      </div>
    `;
  } finally {
    if (explainBtn) explainBtn.disabled = false;
  }
}

/**
 * Simple markdown to HTML converter
 */
function renderMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<')) return match;
      return match;
    });
}

// Subscribe to state changes
subscribe(() => render());

// Listen for custom re-render events (from file tree)
window.addEventListener('repox:rerender', () => render());

// Listen for file selection from graph (update info without full re-render)
window.addEventListener('repox:fileselected', ((e: CustomEvent) => {
  const file = e.detail.file;
  if (!file) return;
  
  // Create or update a floating file info bar
  let infoBar = document.getElementById('graph-file-info');
  if (!infoBar) {
    infoBar = document.createElement('div');
    infoBar.id = 'graph-file-info';
    infoBar.className = 'graph-file-info';
    document.querySelector('.graph-panel')?.appendChild(infoBar);
  }
  
  infoBar.innerHTML = `
    <span class="file-info-icon">📄</span>
    <span class="file-info-name">${file.name}</span>
    <span class="file-info-path">${file.path}</span>
    ${file.size ? `<span class="file-info-size">${formatFileSize(file.size)}</span>` : ''}
  `;
  infoBar.style.display = 'flex';
}) as EventListener);

// Helper for file size formatting
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// Initialize
render();
